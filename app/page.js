'use client'

import { useMemo, useState } from 'react'

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
  const ready = useMemo(() => cv.trim().length > 40 && job.trim().length > 40, [cv, job])

  function run() {
    if (!ready) return
    setResult(analyse(cv, job))
  }

  function demo() {
    setCv(sampleCv)
    setJob(sampleJob)
    setResult(analyse(sampleCv, sampleJob))
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
        <p>CV’ni ve ilanı karşılaştır. JobFit sana eşleşme skorunu, güçlü yönlerini ve CV’ndeki eksikleri birkaç saniyede göstersin.</p>
        <div className="heroActions">
          <button className="primary" onClick={() => document.getElementById('analyser')?.scrollIntoView({ behavior: 'smooth' })}>CV’mi analiz et</button>
          <button className="ghost" onClick={demo}>Örnek analizi göster</button>
        </div>
      </section>

      <section id="analyser" className="wrap analyser">
        <div className="inputCard">
          <div className="step">01</div>
          <h2>CV içeriğin</h2>
          <p>Şimdilik CV metnini yapıştır. PDF/DOCX yükleme bir sonraki sürümde.</p>
          <textarea value={cv} onChange={e => setCv(e.target.value)} placeholder="Deneyim, eğitim, beceri ve projelerini içeren CV metnini buraya yapıştır..." />
        </div>

        <div className="inputCard">
          <div className="step">02</div>
          <h2>İş ilanı</h2>
          <p>İlan açıklamasını yapıştır. URL analizi sonraki sürümde.</p>
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
            <div><small>SONRAKİ ADIM</small><h3>CV’ni bu ilana özel yeniden yaz</h3><p>Yakında JobFit, olmayan tecrübeyi uydurmadan deneyimlerini ATS uyumlu şekilde yeniden düzenleyecek.</p></div>
            <button disabled>Yakında</button>
          </div>
        </section>
      )}

      <footer className="wrap">JobFit · Türkiye için geliştiriliyor</footer>
    </main>
  )
}
