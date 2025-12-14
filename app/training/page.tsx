'use client'

import { useEffect, useState } from 'react'
import { ApiKeyGuard } from '../../components/ApiKeyGuard'

type FieldStat = {
  count?: any
  success_rate?: any
  avg_confidence?: any
}

type Summary = {
  total_patterns?: number
  pattern_distribution?: Record<string, number>
  performance?: Record<string, number>
  quality_score?: number
  fields_trained?: string[]
}

export default function TrainingPage() {
  return (
    <ApiKeyGuard description="Enter the private API key to view training stats.">
      {(apiKey) => <ProtectedTraining apiKey={apiKey} />}
    </ApiKeyGuard>
  )
}

function ProtectedTraining({ apiKey }: { apiKey: string }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [byField, setByField] = useState<Record<string, FieldStat>>({})
  const [fullStats, setFullStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [sumRes, statsRes] = await Promise.all([
        fetch('http://localhost:5002/training/summary', { headers: apiKey ? { 'x-api-key': apiKey } : {} }),
        fetch('http://localhost:5002/training/stats', { headers: apiKey ? { 'x-api-key': apiKey } : {} }),
      ])
      if (sumRes.status === 401 || statsRes.status === 401) {
        if (typeof window !== 'undefined') window.localStorage.removeItem('apiKey')
        throw new Error('Unauthorized, please re-enter API key')
      }
      if (!sumRes.ok) throw new Error(await sumRes.text())
      if (!statsRes.ok) throw new Error(await statsRes.text())
      const sumData = await sumRes.json()
      const statsData = await statsRes.json()
      setSummary(sumData)
      setByField(statsData?.by_field || {})
      setFullStats(statsData)
    } catch (e: any) {
      setError(e.message || 'Failed to load training stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [apiKey])

  const formatPct = (v?: number) => (v === undefined ? '-' : `${(v * 100).toFixed(1)}%`)
  const formatNum = (v?: number) => (v === undefined ? '-' : v.toFixed(2))

  return (
    <main style={{ maxWidth: 960, margin: '32px auto', padding: '0 20px' }}>
      <div style={{ background: 'white', padding: 20, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>Training Overview</h1>
            <p style={{ margin: '6px 0 0', color: '#555' }}>Model patterns, quality, and per-field stats from the Python service.</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2563eb', background: '#2563eb', color: 'white', cursor: 'pointer' }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error && <div style={{ color: '#b91c1c', marginBottom: 12 }}>Error: {error}</div>}

        {summary ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginTop: 8 }}>
            <StatCard label="Total Patterns" value={summary.total_patterns ?? 0} />
            <StatCard label="Quality Score" value={formatNum(summary.quality_score)} />
            <StatCard label="Performance Avg" value={formatNum(summary.performance?.average)} />
            <StatCard label="Trusted" value={summary.pattern_distribution?.trusted ?? 0} />
            <StatCard label="Validated" value={summary.pattern_distribution?.validated ?? 0} />
            <StatCard label="Candidate" value={summary.pattern_distribution?.candidate ?? 0} />
            <StatCard label="Deprecated" value={summary.pattern_distribution?.deprecated ?? 0} />
          </div>
        ) : (
          <div style={{ color: '#555', marginTop: 12 }}>{loading ? 'Loading...' : 'No data yet'}</div>
        )}
      </div>

      <div style={{ marginTop: 16, background: 'white', padding: 20, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: 0, marginBottom: 10, fontSize: 18 }}>Per-field stats</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px' }}>Field</th>
                <th style={{ padding: '8px' }}>Patterns</th>
                <th style={{ padding: '8px' }}>Avg Confidence</th>
                <th style={{ padding: '8px' }}>Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byField).map(([field, stat]) => {
                const countVal =
                  typeof stat.count === 'object'
                    ? JSON.stringify(stat.count)
                    : stat.count ?? '-'
                const avgConfVal =
                  typeof stat.avg_confidence === 'number'
                    ? formatNum(stat.avg_confidence)
                    : typeof stat.avg_confidence === 'object'
                    ? JSON.stringify(stat.avg_confidence)
                    : '-'
                const successVal =
                  typeof stat.success_rate === 'number'
                    ? formatPct(stat.success_rate)
                    : typeof stat.success_rate === 'object'
                    ? JSON.stringify(stat.success_rate)
                    : '-'
                return (
                  <tr key={field} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{field}</td>
                    <td style={{ padding: '8px' }}>{countVal}</td>
                    <td style={{ padding: '8px' }}>{avgConfVal}</td>
                    <td style={{ padding: '8px' }}>{successVal}</td>
                  </tr>
                )
              })}
              {Object.keys(byField).length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '12px', color: '#666' }}>
                    {loading ? 'Loading...' : 'No field stats yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {fullStats && (
        <div style={{ marginTop: 16, background: 'white', padding: 16, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 16 }}>Pattern states</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
            {Object.entries(fullStats.by_state || {}).map(([state, data]: any) => {
              const val = typeof data === 'object' ? data.count ?? JSON.stringify(data) : data
              return <StatCard key={state} label={state} value={val} />
            })}
          </div>
          <h3 style={{ margin: '12px 0 6px', fontSize: 14 }}>Performance (raw)</h3>
          <pre style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, overflowX: 'auto' }}>
            {JSON.stringify(fullStats.performance || {}, null, 2)}
          </pre>
          <h3 style={{ margin: '12px 0 6px', fontSize: 14 }}>Raw summary</h3>
          <pre style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, overflowX: 'auto' }}>
            {JSON.stringify(fullStats.summary || fullStats, null, 2)}
          </pre>
        </div>
      )}
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, background: 'white' }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  )
}
