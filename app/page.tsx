'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader, X, Zap, Shield, Info, FileText } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

type UploadedFile = {
  id: string
  filename: string
  status: 'uploading' | 'extracting' | 'done' | 'error'
  progress: number
  errorMessage?: string
}

const PYTHON_SERVICE = 'http://localhost:5002'

function PublicUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = (selectedFiles: File[]) => {
    selectedFiles.forEach(file => {
      uploadFile(file)
    })
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const selectedFiles = Array.from(e.dataTransfer.files || [])
    processFiles(selectedFiles)
  }

  const uploadFile = async (file: File) => {
    const id = `${Date.now()}-${Math.random()}`
    const fileEntry: UploadedFile = {
      id,
      filename: file.name,
      status: 'uploading',
      progress: 0,
    }

    setFiles(prev => [...prev, fileEntry])

    const validExtensions = ['pdf', 'png', 'jpg', 'jpeg']
    const fileExtension = file.name.split('.').pop()?.toLowerCase()

    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      setFiles(prev => prev.map(f =>
        f.id === id
          ? {
              ...f,
              status: 'error',
              errorMessage: 'Invalid file type. Allowed: PDF, PNG, JPG, JPEG'
            }
          : f
      ))
      toast.error(`Invalid file type: ${file.name}`)
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setFiles(prev => prev.map(f =>
        f.id === id
          ? {
              ...f,
              status: 'error',
              errorMessage: 'File too large (max 50MB)'
            }
          : f
      ))
      toast.error(`File too large: ${file.name}`)
      return
    }

    try {
      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'uploading', progress: 20 } : f
      ))

      const formData = new FormData()
      formData.append('files', file)

      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, progress: 40 } : f
      ))

      const uploadResponse = await fetch(`${PYTHON_SERVICE}/public-upload`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }

      await uploadResponse.json()

      setFiles(prev => prev.map(f =>
        f.id === id
          ? {
              ...f,
              status: 'done',
              progress: 100,
            }
          : f
      ))

      toast.success(`✅ Uploaded: ${file.name}`)
    } catch (error) {
      console.error('Upload error:', error)
      setFiles(prev => prev.map(f =>
        f.id === id
          ? {
              ...f,
              status: 'error',
              errorMessage: error instanceof Error ? error.message : 'Upload failed'
            }
          : f
      ))
      toast.error(`Failed: ${file.name}`)
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const clearAll = () => {
    setFiles([])
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'extracting':
        return <Loader size={20} style={{ color: 'var(--color-gray-400)' }} />
      case 'done':
        return <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
      case 'error':
        return <AlertCircle size={20} style={{ color: 'var(--color-error)' }} />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...'
      case 'extracting':
        return 'Extracting...'
      case 'done':
        return 'Completed'
      case 'error':
        return 'Failed'
      default:
        return 'Pending'
    }
  }

  return (
    <div>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-gray-200)',
        overflow: 'hidden',
      }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => {
            const selectedFiles = Array.from(e.target.files || [])
            processFiles(selectedFiles)
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          }}
          style={{ display: 'none' }}
        />

        <div style={{ padding: 'var(--spacing-8)' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-4)',
              padding: 'var(--spacing-12)',
              cursor: 'pointer',
              background: dragActive ? 'var(--color-gray-50)' : 'white',
              border: dragActive ? '2px solid var(--color-gray-400)' : '2px dashed var(--color-gray-300)',
              borderRadius: 'var(--radius-lg)',
              transition: 'all 0.3s ease',
            }}
          >
            <Upload size={32} style={{ color: dragActive ? 'var(--color-gray-700)' : 'var(--color-gray-400)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-gray-900)', margin: 0 }}>
                {dragActive ? 'Drop your files here' : 'Drag & drop invoices here'}
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', marginTop: 'var(--spacing-1)', margin: 0 }}>
                or click to browse your computer
              </p>
            </div>
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-gray-200)',
          marginTop: 'var(--spacing-6)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-5)',
            borderBottom: '1px solid var(--color-gray-200)',
            backgroundColor: 'var(--color-gray-50)',
          }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-gray-900)', margin: 0 }}>
              Uploaded Files ({files.length})
            </h3>
            {files.some(f => !['uploading', 'extracting'].includes(f.status)) && (
              <button
                onClick={clearAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-gray-500)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                Clear all
              </button>
            )}
          </div>

          <div style={{ padding: 'var(--spacing-5)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {files.map(file => (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-3)',
                  padding: 'var(--spacing-4)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid var(--color-gray-200)`,
                  backgroundColor: file.status === 'error' ? '#fef2f2' : file.status === 'done' ? '#f0fdf4' : 'white',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  {getStatusIcon(file.status)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.filename}
                  </p>
                  {file.status === 'error' ? (
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error-dark)', marginTop: 'var(--spacing-1)' }}>
                      {file.errorMessage || 'Upload failed'}
                    </p>
                  ) : file.status !== 'done' ? (
                    <div style={{
                      marginTop: 'var(--spacing-2)',
                      width: '100%',
                      height: '6px',
                      backgroundColor: 'var(--color-gray-200)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}>
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: file.status === 'extracting' ? 'var(--color-gray-600)' : 'var(--color-gray-700)',
                          width: `${file.progress}%`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  ) : (
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success-dark)', marginTop: 'var(--spacing-1)' }}>
                      Uploaded
                    </p>
                  )}
                </div>

                <div style={{ flexShrink: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-600)' }}>
                  {getStatusText(file.status)}
                </div>

                {['error', 'done'].includes(file.status) && (
                  <button
                    onClick={() => removeFile(file.id)}
                    style={{
                      flexShrink: 0,
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-gray-400)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default function UploadPage() {
  useEffect(() => {
    // ensure CSS variables exist for inline styles in this design
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-gray-50', '#f8fafc')
      document.documentElement.style.setProperty('--color-gray-100', '#f1f5f9')
      document.documentElement.style.setProperty('--color-gray-200', '#e2e8f0')
      document.documentElement.style.setProperty('--color-gray-300', '#cbd5e1')
      document.documentElement.style.setProperty('--color-gray-400', '#94a3b8')
      document.documentElement.style.setProperty('--color-gray-500', '#64748b')
      document.documentElement.style.setProperty('--color-gray-600', '#475569')
      document.documentElement.style.setProperty('--color-gray-700', '#334155')
      document.documentElement.style.setProperty('--color-gray-900', '#0f172a')
      document.documentElement.style.setProperty('--color-success', '#16a34a')
      document.documentElement.style.setProperty('--color-success-dark', '#166534')
      document.documentElement.style.setProperty('--color-error', '#ef4444')
      document.documentElement.style.setProperty('--color-error-dark', '#b91c1c')
      document.documentElement.style.setProperty('--radius-lg', '12px')
      document.documentElement.style.setProperty('--radius-md', '10px')
      document.documentElement.style.setProperty('--radius-full', '999px')
      document.documentElement.style.setProperty('--spacing-1', '4px')
      document.documentElement.style.setProperty('--spacing-2', '8px')
      document.documentElement.style.setProperty('--spacing-3', '12px')
      document.documentElement.style.setProperty('--spacing-4', '16px')
      document.documentElement.style.setProperty('--spacing-5', '20px')
      document.documentElement.style.setProperty('--spacing-6', '24px')
      document.documentElement.style.setProperty('--spacing-8', '32px')
      document.documentElement.style.setProperty('--spacing-12', '48px')
      document.documentElement.style.setProperty('--font-size-xs', '12px')
      document.documentElement.style.setProperty('--font-size-sm', '14px')
      document.documentElement.style.setProperty('--font-size-base', '16px')
      document.documentElement.style.setProperty('--font-size-2xl', '24px')
      document.documentElement.style.setProperty('--font-weight-medium', '500')
      document.documentElement.style.setProperty('--font-weight-semibold', '600')
      document.documentElement.style.setProperty('--font-weight-bold', '700')
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-gray-50)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Toaster position="top-right" />
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid var(--color-gray-200)',
        padding: 'var(--spacing-8) var(--spacing-6)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-gray-100)',
            }}>
              <FileText size={24} style={{ color: 'var(--color-gray-700)' }} />
            </div>
            <div>
              <h1 style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-gray-900)',
                margin: 0,
              }}>
                Invoice Dataset Submission
              </h1>
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-gray-600)',
                marginTop: 'var(--spacing-1)',
                margin: 0,
              }}>
                Help improve our AI by contributing sample invoices
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--spacing-8) var(--spacing-6)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--spacing-6)',
            marginBottom: 'var(--spacing-8)',
          }}>
            <div>
              <PublicUpload />
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-4)',
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-5)',
                border: '1px solid var(--color-gray-200)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-3)' }}>
                  <Info size={20} style={{ color: 'var(--color-gray-600)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-gray-900)', margin: 0, marginBottom: 'var(--spacing-2)' }}>
                      Accepted Formats
                    </h3>
                    <ul style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', paddingLeft: 'var(--spacing-5)', margin: 0 }}>
                      <li>PDF documents</li>
                      <li>PNG images</li>
                      <li>JPG/JPEG images</li>
                      <li>Up to 50MB per file</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-5)',
                border: '1px solid var(--color-gray-200)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-3)' }}>
                  <Zap size={20} style={{ color: 'var(--color-gray-600)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-gray-900)', margin: 0, marginBottom: 'var(--spacing-2)' }}>
                      Why Your Data Matters
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', margin: 0, marginBottom: 'var(--spacing-2)' }}>
                      Your invoices help our AI learn to:
                    </p>
                    <ul style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', paddingLeft: 'var(--spacing-5)', margin: 0 }}>
                      <li>Extract data accurately</li>
                      <li>Handle varied formats</li>
                      <li>Work across industries</li>
                      <li>Improve continuously</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-5)',
                border: '1px solid var(--color-gray-200)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-3)' }}>
                  <Shield size={20} style={{ color: 'var(--color-gray-600)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-gray-900)', margin: 0, marginBottom: 'var(--spacing-2)' }}>
                      Data Privacy
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', margin: 0 }}>
                      All submitted invoices are used exclusively for training our AI system. Your data is processed securely and never shared.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader, X, Zap, Shield, Info, FileText } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

type UploadedFile = {
  id: string
  filename: string
  status: 'uploading' | 'extracting' | 'done' | 'error'
  progress: number
  errorMessage?: string
}

const PYTHON_SERVICE = 'http://localhost:5002'

function PublicUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = (selectedFiles: File[]) => {
    selectedFiles.forEach(file => {
      uploadFile(file)
    })
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const selectedFiles = Array.from(e.dataTransfer.files || [])
    processFiles(selectedFiles)
  }

  const uploadFile = async (file: File) => {
    const id = `${Date.now()}-${Math.random()}`
    const fileEntry: UploadedFile = {
      id,
      filename: file.name,
      status: 'uploading',
      progress: 0,
    }

    setFiles(prev => [...prev, fileEntry])

    const validExtensions = ['pdf', 'png', 'jpg', 'jpeg']
    const fileExtension = file.name.split('.').pop()?.toLowerCase()

    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      setFiles(prev => prev.map(f =>
        f.id === id
          ? {
              ...f,
              status: 'error',
              errorMessage: 'Invalid file type. Allowed: PDF, PNG, JPG, JPEG'
            }
          : f
      ))
      toast.error(`Invalid file type: ${file.name}`)
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setFiles(prev => prev.map(f =>
        f.id === id
          ? {
              ...f,
              status: 'error',
              errorMessage: 'File too large (max 50MB)'
            }
          : f
      ))
      toast.error(`File too large: ${file.name}`)
      return
    }

    try {
      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'uploading', progress: 20 } : f
      ))

      const formData = new FormData()
      formData.append('files', file)

      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, progress: 40 } : f
      ))

      const uploadResponse = await fetch(`${PYTHON_SERVICE}/public-upload`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }

      await uploadResponse.json()

      setFiles(prev => prev.map(f =>
        f.id === id
          ? {
              ...f,
              status: 'done',
              progress: 100,
            }
          : f
      ))

      toast.success(`✅ Uploaded: ${file.name}`)
    } catch (error) {
      console.error('Upload error:', error)
      setFiles(prev => prev.map(f =>
        f.id === id
          ? {
              ...f,
              status: 'error',
              errorMessage: error instanceof Error ? error.message : 'Upload failed'
            }
          : f
      ))
      toast.error(`Failed: ${file.name}`)
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const clearAll = () => {
    setFiles([])
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'extracting':
        return <Loader size={20} style={{ color: 'var(--color-gray-400)' }} />
      case 'done':
        return <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
      case 'error':
        return <AlertCircle size={20} style={{ color: 'var(--color-error)' }} />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...'
      case 'extracting':
        return 'Extracting...'
      case 'done':
        return 'Completed'
      case 'error':
        return 'Failed'
      default:
        return 'Pending'
    }
  }

  return (
    <div>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-gray-200)',
        overflow: 'hidden',
      }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => {
            const selectedFiles = Array.from(e.target.files || [])
            processFiles(selectedFiles)
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          }}
          style={{ display: 'none' }}
        />

        <div style={{ padding: 'var(--spacing-8)' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-4)',
              padding: 'var(--spacing-12)',
              cursor: 'pointer',
              background: dragActive ? 'var(--color-gray-50)' : 'white',
              border: dragActive ? '2px solid var(--color-gray-400)' : '2px dashed var(--color-gray-300)',
              borderRadius: 'var(--radius-lg)',
              transition: 'all 0.3s ease',
            }}
          >
            <Upload size={32} style={{ color: dragActive ? 'var(--color-gray-700)' : 'var(--color-gray-400)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-gray-900)', margin: 0 }}>
                {dragActive ? 'Drop your files here' : 'Drag & drop invoices here'}
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', marginTop: 'var(--spacing-1)', margin: 0 }}>
                or click to browse your computer
              </p>
            </div>
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-gray-200)',
          marginTop: 'var(--spacing-6)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-5)',
            borderBottom: '1px solid var(--color-gray-200)',
            backgroundColor: 'var(--color-gray-50)',
          }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-gray-900)', margin: 0 }}>
              Uploaded Files ({files.length})
            </h3>
            {files.some(f => !['uploading', 'extracting'].includes(f.status)) && (
              <button
                onClick={clearAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-gray-500)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                }}
              >
                Clear all
              </button>
            )}
          </div>

          <div style={{ padding: 'var(--spacing-5)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {files.map(file => (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-3)',
                  padding: 'var(--spacing-4)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid var(--color-gray-200)`,
                  backgroundColor: file.status === 'error' ? '#fef2f2' : file.status === 'done' ? '#f0fdf4' : 'white',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  {getStatusIcon(file.status)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.filename}
                  </p>
                  {file.status === 'error' ? (
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error-dark)', marginTop: 'var(--spacing-1)' }}>
                      {file.errorMessage || 'Upload failed'}
                    </p>
                  ) : file.status !== 'done' ? (
                    <div style={{
                      marginTop: 'var(--spacing-2)',
                      width: '100%',
                      height: '6px',
                      backgroundColor: 'var(--color-gray-200)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}>
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: file.status === 'extracting' ? 'var(--color-gray-600)' : 'var(--color-gray-700)',
                          width: `${file.progress}%`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  ) : (
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success-dark)', marginTop: 'var(--spacing-1)' }}>
                      Uploaded
                    </p>
                  )}
                </div>

                <div style={{ flexShrink: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-gray-600)' }}>
                  {getStatusText(file.status)}
                </div>

                {['error', 'done'].includes(file.status) && (
                  <button
                    onClick={() => removeFile(file.id)}
                    style={{
                      flexShrink: 0,
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-gray-400)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default function UploadPage() {
  useEffect(() => {
    // ensure CSS variables exist for inline styles in this design
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-gray-50', '#f8fafc')
      document.documentElement.style.setProperty('--color-gray-100', '#f1f5f9')
      document.documentElement.style.setProperty('--color-gray-200', '#e2e8f0')
      document.documentElement.style.setProperty('--color-gray-300', '#cbd5e1')
      document.documentElement.style.setProperty('--color-gray-400', '#94a3b8')
      document.documentElement.style.setProperty('--color-gray-500', '#64748b')
      document.documentElement.style.setProperty('--color-gray-600', '#475569')
      document.documentElement.style.setProperty('--color-gray-700', '#334155')
      document.documentElement.style.setProperty('--color-gray-900', '#0f172a')
      document.documentElement.style.setProperty('--color-success', '#16a34a')
      document.documentElement.style.setProperty('--color-success-dark', '#166534')
      document.documentElement.style.setProperty('--color-error', '#ef4444')
      document.documentElement.style.setProperty('--color-error-dark', '#b91c1c')
      document.documentElement.style.setProperty('--radius-lg', '12px')
      document.documentElement.style.setProperty('--radius-md', '10px')
      document.documentElement.style.setProperty('--radius-full', '999px')
      document.documentElement.style.setProperty('--spacing-1', '4px')
      document.documentElement.style.setProperty('--spacing-2', '8px')
      document.documentElement.style.setProperty('--spacing-3', '12px')
      document.documentElement.style.setProperty('--spacing-4', '16px')
      document.documentElement.style.setProperty('--spacing-5', '20px')
      document.documentElement.style.setProperty('--spacing-6', '24px')
      document.documentElement.style.setProperty('--spacing-8', '32px')
      document.documentElement.style.setProperty('--spacing-12', '48px')
      document.documentElement.style.setProperty('--font-size-xs', '12px')
      document.documentElement.style.setProperty('--font-size-sm', '14px')
      document.documentElement.style.setProperty('--font-size-base', '16px')
      document.documentElement.style.setProperty('--font-size-2xl', '24px')
      document.documentElement.style.setProperty('--font-weight-medium', '500')
      document.documentElement.style.setProperty('--font-weight-semibold', '600')
      document.documentElement.style.setProperty('--font-weight-bold', '700')
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #ffffff 100%)' }}>
      <Toaster position="top-right" />

      <section style={{ padding: '56px 20px 32px', borderBottom: '1px solid #e5e7eb', background: 'radial-gradient(circle at 20% 20%, #e0f2fe 0, transparent 35%), radial-gradient(circle at 80% 0%, #c7d2fe 0, transparent 30%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, background: '#e0f2fe', color: '#075985', fontSize: 12, fontWeight: 700 }}>
              <Upload size={16} /> Secure Invoice Intake
            </div>
            <h1 style={{ margin: '12px 0 8px', fontSize: 32, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              Upload invoices for AI training and review
            </h1>
            <p style={{ margin: '0 0 12px', color: '#475569', fontSize: 15, lineHeight: 1.6 }}>
              Files are stored securely on the Python backend for human review and learning. Accepted formats: PDF/PNG/JPG up to 50MB.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: '#0f172a', fontSize: 13 }}>
              <Badge color="#e0f2fe" text="Position-aware extraction" />
              <Badge color="#dcfce7" text="Secure storage" />
              <Badge color="#fee2e2" text="Reviewer-gated learning" />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <InfoCard icon={<FileText size={18} color="#0f172a" />} title="Accepted formats" items={['PDF, PNG, JPG/JPEG', 'Max 50MB per file']} />
            <InfoCard icon={<Shield size={18} color="#0f172a" />} title="Privacy" items={['Stored on Python service', 'Used only for training']} />
            <InfoCard icon={<Zap size={18} color="#0f172a" />} title="Workflow" items={['Upload → Review → Save & Learn', 'Positions captured for higher accuracy']} />
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          <PublicUpload />
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 6px 24px rgba(15,23,42,0.06)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#0f172a' }}>How to use</h3>
            <ol style={{ margin: 0, paddingLeft: 20, color: '#475569', lineHeight: 1.6, fontSize: 14 }}>
              <li>Select PDF/PNG/JPG (≤50MB).</li>
              <li>Files are stored securely; no auto-learning until reviewed.</li>
              <li>Open Submissions, View, correct, then Save & Learn.</li>
            </ol>
            <div style={{ marginTop: 12, fontSize: 12, color: '#475569' }}>
              Need access? Use the private API key on the review/training pages.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Badge({ color, text }: { color: string; text: string }) {
  return (
    <span style={{ padding: '6px 10px', borderRadius: 999, background: color, color: '#0f172a', fontWeight: 700 }}>
      {text}
    </span>
  )
}

function InfoCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, boxShadow: '0 4px 18px rgba(15,23,42,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: '#0f172a', fontWeight: 700 }}>{icon} {title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', fontSize: 13, lineHeight: 1.5 }}>
        {items.map((it) => <li key={it}>{it}</li>)}
      </ul>
    </div>
  )
}
