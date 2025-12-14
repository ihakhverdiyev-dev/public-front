'use client'

import { useEffect, useState } from 'react'

type Props = {
  children: (apiKey: string) => React.ReactNode
  title?: string
  description?: string
}

export function ApiKeyGuard({ children, title = 'Enter API Key', description }: Props) {
  const [apiKey, setApiKey] = useState<string>('')
  const [input, setInput] = useState<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('apiKey')
    if (stored) {
      setApiKey(stored)
      setInput(stored)
    }
  }, [])

  const saveKey = () => {
    const val = input.trim()
    if (!val) return
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('apiKey', val)
    }
    setApiKey(val)
  }

  const resetKey = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('apiKey')
    }
    setApiKey('')
    setInput('')
  }

  if (!apiKey) {
    return (
      <main style={{ maxWidth: 480, margin: '40px auto', background: 'white', padding: 20, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h1 style={{ margin: '0 0 8px 0' }}>{title}</h1>
        {description && <p style={{ margin: '0 0 12px', color: '#555' }}>{description}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="API key"
            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
          />
          <button onClick={saveKey} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #2563eb', background: '#2563eb', color: 'white', cursor: 'pointer' }}>
            Login
          </button>
        </div>
      </main>
    )
  }

  return (
    <>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 12px', textAlign: 'right', fontSize: 12, color: '#555' }}>
        <button onClick={resetKey} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer' }}>Logout</button>
      </div>
      {children(apiKey)}
    </>
  )
}
