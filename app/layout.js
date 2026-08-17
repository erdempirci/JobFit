import './globals.css'

export const metadata = {
  title: 'JobFit — İlanla CV eşleşmeni ölç',
  description: 'CV ve iş ilanını karşılaştır, güçlü yönlerini ve eksik anahtar kelimeleri gör.'
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
