'use client'

import { useMemo, useRef, useState } from 'react'

const STOP = new Set('ve veya ile için bir bu şu o da de ki mi mı mu mü the a an and or to of in on for with as is are be will you your we our'.split(' '))

function words(text) {
  return [...new Set(
    text
      .toLocaleLowerCase('tr-TR')
      .replace(/[^a-z0-9çğıöşü+#.\-\s]/gi, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 2 && !STOP.has(w))
  )]
}

function analyse(cv, job) {
  const cvWords = new Set(words(cv))
  const jobWords = words(job)
  const matched = jobWords.filter(w => cvWords.has(w))
  const missing = jobWords.filter(w => !cvWords.has(w))
  const raw = jobWords.length ? matched.length / jobWords.length : 0
  const score = Math.min(98, Math.max(18, Math.round(raw * 100 + 18)))
  return {
    score,
    matched: matched.slice(0, 14),
    missing: missing.slice(0, 14),
    verdict: score >= 80 ? 'Güçlü eşleşme — başvur.' : score >= 60 ? 'Başvurmaya değer — CV’yi ilana göre güçlendir.' : 'Önce CV’yi hedef role göre güçlendir.'
  }
}

const sampleCv = `Mechanical Team Lead. 7+ years experience in mechanical engineering, piping, HVAC, chilled water systems, P&ID review, commissioning, supplier coordination, SOLAS and classification society requirements. Project leadership, technical documentation and multidisciplinary coordination.`
const sampleJob = `We are looking for a Senior Mechanical Engineer with experience in HVAC, piping, commissioning, P&ID, project management, supplier coordination, SAP, technical documentation, marine systems and classification society rules. Strong English communication is required.`

export default function Home() {
  const [cv, setCv] = useState('')
  const [job, setJob] = useState('')
  const [result, setResult] = useState(null)
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)
  const ready = useMemo(() => cv.trim().length > 40 && job.trim().length > 40, [cv, job])

  function run() {
    if (!ready) return
    setResult(analyse(cv, job))
  }

  function demo() {
    setCv(sampleCv)
    setJob(sampleJob)
    setFileName('Örnek CV')
    setResult(analyse(sampleCv, sampleJob))
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError('')
    setFileName(file.name)

    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/extract', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'CV okunamadı.')
      setCv(data.text)
      setFileName(data.fileName || file.name)
    } catch (error) {
      setUploadError(error.message || 'CV yüklenirken hata oluştu.')
      setFileName('')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function clearFile() {
    setCv('')
    setFileName('')
    setUploadError('')
    setResult(null)
  }

  return (
    <main>
      <nav className="nav wrap">
        <div className="brand"><span className="brandMark">J</span>JobFit</div>
        <span className="beta">MVP</span>
      </nav>

      <section className="hero wrap">
        <div className="eyebrow">AI destekli iş başvuru copilotu</div>
        <h1>Bu işe gerçekten <span>uygun musun?</span></h1>
        <p>CV’ni yükle ve ilanı karşılaştır. JobFit sana eşleşme skorunu, güçlü yönlerini ve CV’ndeki eksikleri birkaç saniyede göstersin.</p>
        <div className="heroActions">
          <button className="primary" onClick={() => document.getElementById('analyser')?.scrollIntoView({ behavior: 'smooth' })}>CV’mi analiz et</button>
          <button className="ghost" onClick={demo}>Örnek analizi göster</button>
        </div>
      </section>

      <section id="analyser" className="wrap analyser">
        <div className="inputCard">
          <div className="step">01</div>
          <h2>CV’ni yükle</h2>
          <p>PDF, DOCX veya TXT dosyanı yükle. JobFit metni otomatik çıkarır. İstersen alttan elle de düzenleyebilirsin.</p>

          <input ref={fileRef} className="fileInput" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={handleFile} />
          <button className="uploadBox" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <span className="uploadIcon">↑</span>
            <strong>{uploading ? 'CV okunuyor…' : fileName ? 'Başka CV yükle' : 'CV dosyası seç'}</strong>
            <small>PDF · DOCX · TXT · Maks. 8 MB</small>
          </button>

          {fileName && !uploading && (
            <div className="fileStatus">
              <div><span>✓</span><div><strong>{fileName}</strong><small>CV içeriği başarıyla okundu</small></div></div>
              <button type="button" onClick={clearFile}>Kaldır</button>
            </div>
          )}
          {uploadError && <div className="uploadError">{uploadError}</div>}

          <div className="orLine"><span>veya metni düzenle / yapıştır</span></div>
          <textarea value={cv} onChange={e => setCv(e.target.value)} placeholder="CV içeriği yükleme sonrası burada görünecek. İstersen elle de yapıştırabilirsin..." />
        </div>

        <div className="inputCard">
          <div className="step">02</div>
          <h2>İş ilanı</h2>
          <p>İlan açıklamasını yapıştır. Sonraki adımda LinkedIn/Kariyer URL’sini doğrudan okutacağız.</p>
          <textarea value={job} onChange={e => setJob(e.target.value)} placeholder="İş ilanının görev, gereksinim ve yetkinlik metnini buraya yapıştır..." />
        </div>
      </section>

      <div className="wrap actionRow">
        <button className="analyseBtn" disabled={!ready} onClick={run}>JobFit skorumu hesapla <span>→</span></button>
      </div>

      {result && (
        <section className="wrap results">
          <div className="scoreCard">
            <div className="scoreRing"><strong>{result.score}</strong><span>/100</span></div>
            <div>
              <div className="eyebrow">JobFit skoru</div>
              <h2>{result.verdict}</h2>
              <p>Bu skor MVP’de kelime ve beceri örtüşmesine göre hesaplanır. AI semantik analiz sonraki sürümde devreye girecek.</p>
            </div>
          </div>

          <div className="resultGrid">
            <article className="resultBox good">
              <h3>✓ Güçlü eşleşmeler</h3>
              <div className="chips">{result.matched.length ? result.matched.map(x => <span key={x}>{x}</span>) : <em>Belirgin eşleşme bulunamadı.</em>}</div>
            </article>
            <article className="resultBox warn">
              <h3>△ CV’de görünmeyenler</h3>
              <div className="chips">{result.missing.length ? result.missing.map(x => <span key={x}>{x}</span>) : <em>Belirgin eksik görünmüyor.</em>}</div>
            </article>
          </div>

          <div className="nextCard">
            <div><small>SONRAKİ ADIM</small><h3>CV’ni bu ilana özel yeniden yaz</h3><p>JobFit, olmayan tecrübeyi uydurmadan deneyimlerini ATS uyumlu şekilde yeniden düzenleyecek.</p></div>
            <button disabled>Yakında</button>
          </div>
        </section>
      )}

      <footer className="wrap">JobFit · Türkiye için geliştiriliyor</footer>
    </main>
  )
}
