'use client'

import { useEffect, useState } from 'react'
import { ApiKeyGuard } from '../../components/ApiKeyGuard'

type Submission = {
  id: string
  original_name: string
  stored_name: string
  stored_path: string
  uploaded_at: string
  extraction_path?: string | null
  reviewed?: boolean
}

export default function SubmissionsPage() {
  return (
    <ApiKeyGuard description="Enter the private API key to view submissions.">
      {(apiKey) => <ProtectedSubmissions apiKey={apiKey} />}
    </ApiKeyGuard>
  )
}

function ProtectedSubmissions({ apiKey }: { apiKey: string }) {
  const [items, setItems] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('http://localhost:5002/submissions', {
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      })
      if (res.status === 401) {
        if (typeof window !== 'undefined') window.localStorage.removeItem('apiKey')
        throw new Error('Unauthorized, please re-enter API key')
      }
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setItems(data || [])
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const viewAndExtract = async (id: string) => {
    try {
      setMessage(`Loading ${id}...`)
      const res = await fetch(`http://localhost:5002/submissions/${id}/extract`, {
        method: 'POST',
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      })
      if (res.status === 401) {
        if (typeof window !== 'undefined') window.localStorage.removeItem('apiKey')
        throw new Error('Unauthorized, please re-enter API key')
      }
      if (!res.ok) throw new Error(await res.text())
      setMessage(`Opening ${id}`)
      await load()
      window.location.href = `/submissions/${id}`
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    }
  }

  useEffect(() => {
    load()
  }, [apiKey])

  return (
    <main style={{ maxWidth: 900, margin: '32px auto', background: 'white', padding: 24, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h1 style={{ marginBottom: 12 }}>Submissions</h1>
      <p style={{ color: '#555', marginBottom: 16 }}>Uploaded files awaiting review.</p>
      {message && <div style={{ marginBottom: 12, color: message.startsWith('Error') ? '#b91c1c' : '#0f766e' }}>{message}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '8px' }}>File</th>
              <th style={{ padding: '8px' }}>Uploaded</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px', width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px' }}>{s.original_name}</td>
                <td style={{ padding: '8px', color: '#555' }}>{s.uploaded_at}</td>
                <td style={{ padding: '8px' }}>
                  {s.reviewed ? (
                    <span style={{ padding: '4px 8px', background: '#dcfce7', color: '#166534', borderRadius: 6, fontSize: 12 }}>
                      Done
                    </span>
                  ) : s.extraction_path ? (
                    <span style={{ padding: '4px 8px', background: '#e0f2fe', color: '#1d4ed8', borderRadius: 6, fontSize: 12 }}>
                      Extracted
                    </span>
                  ) : (
                    <span style={{ padding: '4px 8px', background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: 12 }}>
                      Pending
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px', display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => viewAndExtract(s.id)}
                    style={{ padding: '6px 10px', border: '1px solid #2563eb', background: '#2563eb', color: 'white', borderRadius: 6, cursor: 'pointer' }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
