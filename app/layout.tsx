import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Public Upload',
  description: 'Public upload portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
