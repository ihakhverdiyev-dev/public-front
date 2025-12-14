'use client'

import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useRouter } from 'next/navigation'

// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

type Position = { page: number; bbox: [number, number, number, number] }
type WordBox = { text: string; x1: number; y1: number; x2: number; y2: number; page?: number }

type FormData = {
  invoiceNumber?: string
  vendorName?: string
  vendorTaxId?: string
  vendorIBAN?: string
  invoiceDate?: string
  dueDate?: string
  amount?: string
  taxAmount?: string
  totalAmount?: string
  currency?: string
}

const formFields: { label: string; key: keyof FormData }[] = [
  { label: 'Invoice Number', key: 'invoiceNumber' },
  { label: 'Vendor Name', key: 'vendorName' },
  { label: 'Vendor Tax ID', key: 'vendorTaxId' },
  { label: 'Vendor IBAN', key: 'vendorIBAN' },
  { label: 'Invoice Date', key: 'invoiceDate' },
  { label: 'Due Date', key: 'dueDate' },
  { label: 'Net Amount', key: 'amount' },
  { label: 'Tax Amount', key: 'taxAmount' },
  { label: 'Total Amount', key: 'totalAmount' },
  { label: 'Currency', key: 'currency' },
]

export function ReviewViewer({ data, apiKey }: { data: any; apiKey: string }) {
  const [formData, setFormData] = useState<FormData>({})
  const [activeField, setActiveField] = useState<keyof FormData | null>(null)
  const [selectedWords, setSelectedWords] = useState<
    Record<string, { key: string; text: string; bbox: [number, number, number, number]; page?: number }[]>
  >({})
  const [message, setMessage] = useState('')
  const canvasRefs = useRef<HTMLCanvasElement[]>([])
  const containerRefs = useRef<HTMLDivElement[]>([])
  const renderTasks = useRef<any[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const router = useRouter()

  const ocrBoxes = data.ocr_boxes || []
  const positions = data.positions || {}
  const pageDims = data.page_dimensions || []
  const rawText = data.raw_text || ''
  const pdfBase64 = data.pdf_base64 || ''
  const pdfName = data.pdf_name || 'invoice.pdf'

  useEffect(() => {
    // preload form data
    const mapping: Record<string, keyof FormData> = {
      invoice_id: 'invoiceNumber',
      company_name: 'vendorName',
      company_tax_id: 'vendorTaxId',
      company_iban: 'vendorIBAN',
      invoice_date: 'invoiceDate',
      due_date: 'dueDate',
      total_net: 'amount',
      total_tax: 'taxAmount',
      total_amount: 'totalAmount',
      currency: 'currency',
    }
    const fd: FormData = {}
    Object.entries(data.formatted || {}).forEach(([k, v]: any) => {
      const fk = mapping[k] || (k as keyof FormData)
      fd[fk] = v?.value ?? v ?? ''
    })
    setFormData(fd)
  }, [data])

  useEffect(() => {
    const run = async () => {
      if (!pdfBase64) return
      try {
        const pdfData = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
        const loadingTask = pdfjsLib.getDocument({ data: pdfData })
        const pdf = await loadingTask.promise
        setPageCount(pdf.numPages)
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const rotation = page.rotate || 0
          const viewport = page.getViewport({ scale: 1, rotation })
          const desiredWidth = 900
          const scale = desiredWidth / viewport.width
          const scaledViewport = page.getViewport({ scale, rotation })

          const canvas = canvasRefs.current[i - 1]
          const container = containerRefs.current[i - 1]
          if (!canvas) continue
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          canvas.width = scaledViewport.width
          canvas.height = scaledViewport.height
          if (renderTasks.current[i - 1]) {
            try { renderTasks.current[i - 1].cancel() } catch {}
          }
          const task = page.render({ canvasContext: ctx, viewport: scaledViewport })
          renderTasks.current[i - 1] = task
          await task.promise
          if (container) {
            container.style.width = `${scaledViewport.width}px`
            container.style.height = `${scaledViewport.height}px`
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    run()
    return () => {
      renderTasks.current.forEach(t => { if (t) try { t.cancel() } catch {} })
    }
  }, [pdfBase64])

  const handleWordClick = (w: WordBox) => {
    if (!activeField) return
    const key = `${w.page ?? 0}-${w.x1}-${w.y1}-${w.x2}-${w.y2}`
    setSelectedWords(prev => {
      const list = prev[activeField] || []
      const exists = list.find(x => x.key === key)
      const next = exists
        ? list.filter(x => x.key !== key)
        : [...list, { key, text: w.text, bbox: [w.x1, w.y1, w.x2, w.y2] as [number, number, number, number], page: w.page ?? 0 }]
      setFormData(fd => ({ ...fd, [activeField]: next.map(x => x.text).join(' ') }))
      return { ...prev, [activeField]: next }
    })
  }

  const renderOverlays = (pageIdx: number) => {
    const canvas = canvasRefs.current[pageIdx]
    if (!canvas) return null
    const dims = pageDims.find((p: any) => p.page === pageIdx)
    const pw = dims?.width || canvas.width
    const ph = dims?.height || canvas.height
    const scaleX = canvas.width / pw
    const scaleY = canvas.height / ph
    const selectedKeys = new Set(
      activeField
        ? (selectedWords[activeField] || []).map(w => w.key)
        : Object.values(selectedWords || {}).flatMap(list => list.map(w => w.key))
    )

    const pageBox = (ocrBoxes || []).find((p: any) => (p.page ?? 0) === pageIdx)

    const wordBoxes = pageBox
      ? (pageBox.words || []).slice(0, 5000).map((w: WordBox, idx: number) => {
          const key = `${w.page ?? pageIdx}-${w.x1}-${w.y1}-${w.x2}-${w.y2}`
          const selected = selectedKeys.has(key)
          const left = w.x1 * scaleX
          const top = w.y1 * scaleY
          const width = (w.x2 - w.x1) * scaleX
          const height = (w.y2 - w.y1) * scaleY
          return (
            <div
              key={`w-${pageIdx}-${idx}`}
              style={{
                position: 'absolute',
                left,
                top,
                width,
                height,
                border: selected ? '2px solid rgba(0, 153, 255, 0.95)' : '1px solid rgba(140,140,140,0.6)',
                background: selected ? 'rgba(0, 153, 255, 0.12)' : 'rgba(180,180,180,0.08)',
                pointerEvents: 'auto',
                cursor: activeField ? 'pointer' : 'default',
                boxSizing: 'border-box',
                zIndex: selected ? 3 : 1,
                mixBlendMode: 'multiply',
              }}
              onClick={() => handleWordClick({ ...w, page: w.page ?? pageIdx })}
              title={w.text}
            />
          )
        })
      : null

    const fieldBoxes = Object.entries(positions || {}).flatMap(([field, boxes]: any) =>
      (boxes || []).map((pos: any, idx: number) => {
        if (!pos?.bbox) return null
        const posPage = pos.page ?? 0
        if (posPage !== pageIdx) return null
        const left = pos.bbox[0] * scaleX
        const top = pos.bbox[1] * scaleY
        const width = (pos.bbox[2] - pos.bbox[0]) * scaleX
        const height = (pos.bbox[3] - pos.bbox[1]) * scaleY
        return (
          <div
            key={`f-${field}-${idx}`}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              border: '1.5px dashed rgba(120,120,120,0.7)',
              background: 'rgba(150,150,150,0.05)',
              pointerEvents: 'none',
              zIndex: 1,
              boxSizing: 'border-box',
            }}
            title={field}
          />
        )
      })
    )

    return (
      <>
        {wordBoxes}
        {fieldBoxes}
      </>
    )
  }

  const mapToPythonField = (field: string) => {
    const mapping: Record<string, string> = {
      invoiceNumber: 'invoiceNumber',
      vendorName: 'vendorName',
      vendorTaxId: 'vendorTaxId',
      vendorIBAN: 'iban',
      invoiceDate: 'invoiceDate',
      dueDate: 'dueDate',
      amount: 'amount',
      taxAmount: 'taxAmount',
      totalAmount: 'totalAmount',
      currency: 'currency',
    }
    return mapping[field] || field
  }

  const handleSave = async () => {
    try {
      setMessage('Saving...')
      const corrected: Record<string, any> = {}
      const positionsPayload: Record<string, any> = {}
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          const py = mapToPythonField(k)
          corrected[py] = v
          const sel = selectedWords[k] || []
          if (sel.length > 0) {
            positionsPayload[py] = { page: sel[0].page ?? 0, bbox: sel[0].bbox }
          }
        }
      })

      const res = await fetch('http://localhost:5002/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}) },
        body: JSON.stringify({
          corrected,
          text: rawText || '',
          positions: positionsPayload,
          pdf_base64: pdfBase64,
          pdf_name: pdfName,
          user_id: 'public-review',
          reviewer: true,
        }),
      })
      if (res.status === 401) {
        if (typeof window !== 'undefined') window.localStorage.removeItem('apiKey')
        throw new Error('Unauthorized, please re-enter API key')
      }
      if (!res.ok) throw new Error(await res.text())
      setMessage('Saved & learned')
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage <= 0}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}
          >
            Back
          </button>
          <div style={{ fontSize: 12, color: '#555' }}>
            Page {currentPage + 1} of {Math.max(pageCount, 1)}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(Math.max(pageCount, 1) - 1, p + 1))}
            disabled={currentPage >= Math.max(pageCount, 1) - 1}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}
          >
            Next
          </button>
        </div>

        {Array.from({ length: pageCount || 1 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 900,
              display: idx === currentPage ? 'block' : 'none',
            }}
          >
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current[idx] = el
              }}
              style={{ border: '1px solid #e5e7eb', borderRadius: 6 }}
            />
            <div
              ref={(el) => {
                if (el) containerRefs.current[idx] = el
              }}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            >
              {renderOverlays(idx)}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#555' }}>Page {idx + 1}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, color: '#666' }}>
          Click a field to activate, then click word boxes on the PDF to fill it.
        </div>
        <div
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
          }}
        >
          {formFields.map(({ label, key }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#444' }}>{label}</label>
              <input
                type="text"
                value={formData[key] ?? ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, [key]: e.target.value }))
                  setSelectedWords(prev => ({ ...prev, [key]: [] }))
                }}
                onFocus={() => setActiveField(key)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: activeField === key ? '1.5px solid #2563eb' : '1px solid #d1d5db',
                  fontSize: 13,
                }}
              />
              <div style={{ fontSize: 11, color: '#888' }}>
                {selectedWords[key]?.map(w => w.text).join(' ')}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          style={{ padding: '10px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Save & Learn
        </button>
        {message && <div style={{ fontSize: 12, color: message.startsWith('Error') ? '#b91c1c' : '#0f766e' }}>{message}</div>}
      </div>
    </div>
  )
}
