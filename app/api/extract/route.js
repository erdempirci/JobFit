export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const form = await request.formData()
    const file = form.get('file')

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'Dosya bulunamadı.' }, { status: 400 })
    }

    if (file.size > 8 * 1024 * 1024) {
      return Response.json({ error: 'Dosya en fazla 8 MB olabilir.' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    const arrayBuffer = await file.arrayBuffer()
    let text = ''

    if (name.endsWith('.txt')) {
      text = new TextDecoder('utf-8').decode(arrayBuffer)
    } else if (name.endsWith('.docx')) {
      const mammothModule = await import('mammoth')
      const mammoth = mammothModule.default || mammothModule
      const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) })
      text = result.value
    } else if (name.endsWith('.pdf')) {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
      const pdf = await loadingTask.promise
      const pages = []
      for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        pages.push(content.items.map(item => item.str || '').join(' '))
      }
      text = pages.join('\n\n')
    } else {
      return Response.json({ error: 'Şimdilik PDF, DOCX veya TXT yükleyebilirsin.' }, { status: 400 })
    }

    text = text.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim()

    if (!text) {
      return Response.json({ error: 'Dosyadan okunabilir metin çıkarılamadı.' }, { status: 422 })
    }

    return Response.json({ text, fileName: file.name })
  } catch (error) {
    console.error('CV extraction error:', error)
    return Response.json({ error: 'CV okunurken bir hata oluştu. Başka bir PDF/DOCX ile tekrar dene.' }, { status: 500 })
  }
}
