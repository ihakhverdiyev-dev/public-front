'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ReviewViewer } from './review'
import { ApiKeyGuard } from '../../../components/ApiKeyGuard'

export default function SubmissionDetail() {
  return (
    <ApiKeyGuard description="Enter the private API key to view this submission.">
      {(apiKey) => <ProtectedSubmissionDetail apiKey={apiKey} />}
    </ApiKeyGuard>
  )
}

function ProtectedSubmissionDetail({ apiKey }: { apiKey: string }) {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [data, setData] = useState<any>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`http://localhost:5002/submissions/${id}/extract`, {
        method: 'POST',
        headers: apiKey ? { 'x-api-key': apiKey } : {},
      })
      if (res.status === 401) {
        if (typeof window !== 'undefined') window.localStorage.removeItem('apiKey')
        throw new Error('Unauthorized, please re-enter API key')
      }
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setData(json)
      setStatus('Extraction completed')
    } catch (e: any) {
      setStatus(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      load()
    }
  }, [id, apiKey])

  return (
    <main style={{ maxWidth: 1200, margin: '32px auto', background: 'white', padding: 24, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1>Submission {id}</h1>
        <button onClick={() => router.push('/submissions')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>
          Back
        </button>
      </div>
      {status && <div style={{ marginBottom: 12, color: status.startsWith('Error') ? '#b91c1c' : '#0f766e' }}>{status}</div>}
      {loading && <div>Extracting...</div>}
      {data && <ReviewViewer data={data} apiKey={apiKey} />}
    </main>
  )
}
