'use client'

import { useMemo, useRef, useState } from 'react'

const STOP = new Set('ve veya ile için bir bu şu o da de ki mi mı mu mü the a an and or to of in on for with as is are be been being will would can could should may might you your we our they their from by at it its this that these those looking required preferred requirements responsibilities role position company team work working have has had years year experience experiences'.split(' '))

function isUrl(text) {
  return /^https?:\/\/\S+$/i.test(text.trim())
}

function stem(word) {
  let w = word.toLocaleLowerCase('tr-TR')
  if (w.length > 5) w = w.replace(/(ing|ed|es|s)$/i, '')
  return w
}

function words(text) {
  const cleaned = text
    .replace(/https?:\/\/\S+/gi, ' ')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9çğıöşü+#.\-\s]/gi, ' ')
  return [...new Set(cleaned.split(/\s+/).map(w => stem(w.trim())).filter(w => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)))]
}

function analyse(cv, job) {
  const cvWords = new Set(words(cv))
  const jobWords = words(job)
  const matched = jobWords.filter(w => cvWords.has(w))
  const missing = jobWords.filter(w => !cvWords.has(w))
  const ratio = jobWords.length ? matched.length / jobWords.length : 0
  const score = Math.max(0, Math.min(98, Math.round(ratio * 100)))
  return {
    score,
    matched: matched.slice(0, 16),
    missing: missing.slice(0, 16),
    verdict: score >= 80 ? 'Güçlü eşleşme — başvur.' : score >= 60 ? 'Başvurmaya değer — CV’yi ilana göre güçlendir.' : score >= 40 ? 'Kısmi eşleşme — kritik eksikleri kontrol et.' : 'Düşük eşleşme — ilan içeriğini ve CV’yi kontrol et.'
  }
}

const sampleCv = `Mechanical Team Lead. 7+ years experience in mechanical engineering, piping, HVAC, chilled water systems, P&ID review, commissioning, supplier coordination, SOLAS and classification society requirements. Project leadership, technical documentation and multidisciplinary coordination.`
const sampleJob = `Senior Mechanical Engineer. HVAC, piping, commissioning, P&ID, project management, supplier coordination, technical documentation, marine systems and classification society rules. Strong English communication.`

export default function Home() {
  const [cv, setCv] = useState('')
  const [job, setJob] = useState('')
  const [jobText, setJobText] = useState('')
  const [result, setResult] = useState(null)
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [jobLoading, setJobLoading] = useState(false)
  const [jobError, setJobError] = useState('')
  const [jobSource, setJobSource] = useState('')
  const fileRef = useRef(null)

  const cvReady = cv.trim().length > 40
  const jobReady = isUrl(job) || job.trim().length > 40
  const ready = useMemo(() => cvReady && jobReady, [cvReady, jobReady])

  async function resolveJob() {
    if (!isUrl(job)) return job
    setJobLoading(true)
    setJobError('')
    setJobSource('')
    try {
      const response = await fetch('/api/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: job.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'İlan okunamadı.')
      setJobText(data.text)
      setJobSource(data.source || 'İlan sayfası')
      return data.text
    } catch (error) {
      setJobText('')
      setJobError(error.message || 'İlan URL’si okunamadı.')
      return ''
    } finally {
      setJobLoading(false)
    }
  }

  async function run() {
    if (!ready || jobLoading) return
    setResult(null)
    const resolved = await resolveJob()
    if (!resolved || resolved.trim().length < 40) return
    setResult(analyse(cv, resolved))
  }

  function demo() {
    setCv(sampleCv)
    setJob(sampleJob)
    setJobText(sampleJob)
    setFileName('Örnek CV')
    setJobError('')
    setJobSource('Örnek ilan')
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
      setResult(null)
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

  function changeJob(value) {
    setJob(value)
    setJobText('')
    setJobError('')
    setJobSource('')
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
        <p>CV’ni yükle; ilan metnini veya ilan linkini ekle. JobFit URL’yi skorlamak yerine önce gerçek ilan içeriğini almaya çalışır.</p>
        <div className="heroActions">
          <button className="primary" onClick={() => document.getElementById('analyser')?.scrollIntoView({ behavior: 'smooth' })}>CV’mi analiz et</button>
          <button className="ghost" onClick={demo}>Örnek analizi göster</button>
        </div>
      </section>

      <section id="analyser" className="wrap analyser">
        <div className="inputCard">
          <div className="step">01</div>
          <h2>CV’ni yükle</h2>
          <p>PDF, DOCX veya TXT dosyanı yükle. JobFit metni otomatik çıkarır.</p>
          <input ref={fileRef} className="fileInput" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={handleFile} />
          <button className="uploadBox" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <span className="uploadIcon">↑</span>
            <strong>{uploading ? 'CV okunuyor…' : fileName ? 'Başka CV yükle' : 'CV dosyası seç'}</strong>
            <small>PDF · DOCX · TXT · Maks. 8 MB</small>
          </button>
          {fileName && !uploading && <div className="fileStatus"><div><span>✓</span><div><strong>{fileName}</strong><small>CV içeriği başarıyla okundu</small></div></div><button type="button" onClick={clearFile}>Kaldır</button></div>}
          {uploadError && <div className="uploadError">{uploadError}</div>}
          <div className="orLine"><span>veya metni düzenle / yapıştır</span></div>
          <textarea value={cv} onChange={e => setCv(e.target.value)} placeholder="CV içeriği burada görünecek..." />
        </div>

        <div className="inputCard">
          <div className="step">02</div>
          <h2>İş ilanı</h2>
          <p>LinkedIn/Kariyer ilan linkini veya ilan açıklamasını ekle. Link girersen JobFit önce ilan içeriğini almaya çalışır.</p>
          <textarea value={job} onChange={e => changeJob(e.target.value)} placeholder="https://www.linkedin.com/jobs/view/... veya ilan açıklamasını yapıştır..." />
          {isUrl(job) && !jobError && <div className="jobStatus">↗ URL algılandı — analiz sırasında ilan metni alınacak.</div>}
          {jobLoading && <div className="jobStatus">İlan sayfası okunuyor…</div>}
          {jobSource && jobText && <div className="jobStatus ok">✓ {jobSource} ilan içeriği alındı ({jobText.length.toLocaleString('tr-TR')} karakter)</div>}
          {jobError && <div className="uploadError"><strong>URL skorlanmadı.</strong><br />{jobError}</div>}
        </div>
      </section>

      <div className="wrap actionRow">
        <button className="analyseBtn" disabled={!ready || jobLoading} onClick={run}>{jobLoading ? 'İlan okunuyor…' : 'JobFit skorumu hesapla'} <span>→</span></button>
      </div>

      {result && (
        <section className="wrap results">
          <div className="scoreCard">
            <div className="scoreRing"><strong>{result.score}</strong><span>/100</span></div>
            <div>
              <div className="eyebrow">JobFit skoru</div>
              <h2>{result.verdict}</h2>
              <p>Bu sürümde skor gerçek ilan metnindeki anlamlı kelimelerin CV’deki karşılıklarına göre hesaplanır. URL parçaları artık skora dahil edilmez.</p>
            </div>
          </div>
          <div className="resultGrid">
            <article className="resultBox good"><h3>✓ Güçlü eşleşmeler</h3><div className="chips">{result.matched.length ? result.matched.map(x => <span key={x}>{x}</span>) : <em>Belirgin eşleşme bulunamadı.</em>}</div></article>
            <article className="resultBox warn"><h3>△ CV’de görünmeyenler</h3><div className="chips">{result.missing.length ? result.missing.map(x => <span key={x}>{x}</span>) : <em>Belirgin eksik görünmüyor.</em>}</div></article>
          </div>
          <div className="nextCard"><div><small>SONRAKİ ADIM</small><h3>CV’ni bu ilana özel yeniden yaz</h3><p>Bir sonraki katmanda kelime eşleştirme yerine AI semantik uygunluk analizi ve ilana özel ATS CV üretimi ekleyeceğiz.</p></div><button disabled>Yakında</button></div>
        </section>
      )}
      <footer className="wrap">JobFit · Türkiye için geliştiriliyor</footer>
    </main>
  )
}
