'use client'

import { useMemo, useRef, useState } from 'react'

const CONCEPTS = [
  { id:'seniority', label:'Senior / Lead seviye', weight:12, job:['senior','lead','team lead','principal'], cv:['senior','lead','team lead','project responsible','responsible'] },
  { id:'design', label:'Mekanik tasarım / design engineering', weight:12, job:['design engineer','mechanical design','design engineering','mechanical engineer'], cv:['design engineer','mechanical design','design mechanical','mechanical team lead','engineering'] },
  { id:'piping', label:'Piping sistemleri', weight:14, job:['piping','pipe design','piping system','pipe system'], cv:['piping','pipe design','piping system','pipe system'] },
  { id:'hvac', label:'HVAC / ducting', weight:9, job:['hvac','duct','ventilation','air conditioning'], cv:['hvac','duct','ventilation','air conditioning'] },
  { id:'pid', label:'P&ID', weight:8, job:['p&id','piping and instrumentation'], cv:['p&id','piping and instrumentation'] },
  { id:'cadmatic', label:'Cadmatic', weight:8, job:['cadmatic'], cv:['cadmatic'] },
  { id:'model3d', label:'3D modelleme / routing', weight:7, job:['3d model','3d routing','routing','layout'], cv:['3d model','3d routing','routing','layout'] },
  { id:'marine', label:'Gemi / yat / marine sektörü', weight:12, job:['marine','ship','shipyard','vessel','yacht','offshore','naval'], cv:['marine','ship','shipyard','vessel','yacht','naval','ferry','trawler'] },
  { id:'class', label:'Classification society / class', weight:7, job:['classification','class society','dnv','lloyd','lr ','bureau veritas','bv '], cv:['classification','class society','dnv','lloyd','lr ','bureau veritas','bv '] },
  { id:'solas', label:'SOLAS / denizcilik kuralları', weight:5, job:['solas','imo','regulation','rules and regulations'], cv:['solas','imo','rules and regulations'] },
  { id:'leadership', label:'Ekip / subcontractor koordinasyonu', weight:8, job:['lead team','team management','coordinate','coordination','subcontractor','project management'], cv:['leading a team','lead a great team','coordinating','coordination','subcontractor','project manager'] },
  { id:'docs', label:'Teknik dokümantasyon / isometric / spool', weight:6, job:['documentation','isometric','spool','material list','technical drawing'], cv:['documentation','isometric','spool','material list','technical drawing'] },
  { id:'autocad', label:'AutoCAD / Plant 3D', weight:4, job:['autocad','plant 3d'], cv:['autocad','plant 3d'] },
  { id:'english', label:'İngilizce', weight:5, job:['english','fluent english','communication skills'], cv:['english','good good good'] },
]

function normalize(text='') {
  return String(text).toLocaleLowerCase('en-US').replace(/\s+/g,' ')
}
function hasAny(text, list) { const n=normalize(text); return list.some(x=>n.includes(normalize(x))) }
function isUrl(text) { return /^https?:\/\/\S+$/i.test(text.trim()) }

function buildChecklist(cv, job) {
  const required = CONCEPTS.filter(c => hasAny(job, c.job))
  if (!required.length) return { score:null, items:[], message:'İlandan güvenilir teknik gereksinim çıkarılamadı.' }
  const items = required.map(c => ({ ...c, status: hasAny(cv,c.cv) ? 'match' : 'missing' }))
  const total = items.reduce((s,x)=>s+x.weight,0)
  const earned = items.filter(x=>x.status==='match').reduce((s,x)=>s+x.weight,0)
  const score = total ? Math.round(earned/total*100) : null
  return { score, items, message:'' }
}

const sampleCv = `Mechanical Team Lead. Senior mechanical design engineer. Piping systems, HVAC, P&ID, Cadmatic, 3D routing, classification societies, SOLAS, subcontractor coordination, technical documentation, English.`
const sampleJob = `Senior Mechanical Design Engineer for marine piping systems. Cadmatic, P&ID, HVAC, 3D routing and classification society experience preferred. Coordinate subcontractors and technical documentation.`

export default function Home() {
  const [cv,setCv]=useState('')
  const [job,setJob]=useState('')
  const [jobText,setJobText]=useState('')
  const [jobDetails,setJobDetails]=useState(null)
  const [result,setResult]=useState(null)
  const [fileName,setFileName]=useState('')
  const [uploading,setUploading]=useState(false)
  const [uploadError,setUploadError]=useState('')
  const [jobLoading,setJobLoading]=useState(false)
  const [jobError,setJobError]=useState('')
  const [jobSource,setJobSource]=useState('')
  const [jobStructured,setJobStructured]=useState(false)
  const fileRef=useRef(null)
  const ready=useMemo(()=>cv.trim().length>40 && (isUrl(job)||job.trim().length>40),[cv,job])

  async function resolveJob(){
    if(!isUrl(job)) { setJobDetails({description:job}); setJobText(job); setJobStructured(false); return job }
    setJobLoading(true); setJobError(''); setJobSource(''); setJobDetails(null)
    try{
      const r=await fetch('/api/job',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:job.trim()})})
      const d=await r.json(); if(!r.ok) throw new Error(d.error||'İlan okunamadı.')
      setJobText(d.text); setJobDetails(d.details||null); setJobSource(d.source||'İlan sayfası'); setJobStructured(Boolean(d.structured)); return d.text
    }catch(e){ setJobText(''); setJobDetails(null); setJobError(e.message||'İlan URL’si okunamadı.'); return '' } finally { setJobLoading(false) }
  }

  async function run(){
    if(!ready||jobLoading)return
    setResult(null)
    const resolved=await resolveJob(); if(!resolved||resolved.length<40)return
    setResult(buildChecklist(cv,resolved))
  }

  function demo(){ setCv(sampleCv);setJob(sampleJob);setJobText(sampleJob);setJobDetails({title:'Senior Mechanical Design Engineer',company:'Demo Marine',location:'Rotterdam',description:sampleJob});setFileName('Örnek CV');setJobSource('Örnek ilan');setJobStructured(true);setResult(buildChecklist(sampleCv,sampleJob)) }

  async function handleFile(e){
    const file=e.target.files?.[0]; if(!file)return
    setUploading(true);setUploadError('');setFileName(file.name)
    try{ const form=new FormData();form.append('file',file);const r=await fetch('/api/extract',{method:'POST',body:form});const d=await r.json();if(!r.ok)throw new Error(d.error||'CV okunamadı.');setCv(d.text);setFileName(d.fileName||file.name);setResult(null) }
    catch(err){setUploadError(err.message||'CV yüklenirken hata oluştu.');setFileName('')}
    finally{setUploading(false);if(fileRef.current)fileRef.current.value=''}
  }

  function clearFile(){setCv('');setFileName('');setUploadError('');setResult(null)}
  function changeJob(v){setJob(v);setJobText('');setJobDetails(null);setJobError('');setJobSource('');setJobStructured(false);setResult(null)}

  const verdict = result?.score == null ? 'İlanı daha detaylı okumamız gerekiyor.' : result.score>=80 ? 'Güçlü eşleşme — başvur.' : result.score>=60 ? 'İyi eşleşme — birkaç kritik noktayı kontrol et.' : result.score>=40 ? 'Kısmi eşleşme.' : 'Düşük eşleşme.'
  const detailRows = jobDetails ? [
    ['Pozisyon',jobDetails.title],['Şirket',jobDetails.company],['Lokasyon',jobDetails.location],['Çalışma türü',jobDetails.employmentType],['Sektör',jobDetails.industry],['Deneyim',jobDetails.experience],['Eğitim',jobDetails.education],['Beceriler',jobDetails.skills]
  ].filter(([,v])=>v) : []

  return <main>
    <nav className="nav wrap"><div className="brand"><span className="brandMark">J</span>JobFit</div><span className="beta">MVP</span></nav>
    <section className="hero wrap"><div className="eyebrow">AI destekli iş başvuru copilotu</div><h1>İlanı oku. CV’ni <span>madde madde karşılaştır.</span></h1><p>JobFit önce CV ve ilanı ayrı ayrı okur; sonra gereksinimleri checklist’e çevirir. Skor bu maddelerden hesaplanır.</p><div className="heroActions"><button className="primary" onClick={()=>document.getElementById('analyser')?.scrollIntoView({behavior:'smooth'})}>CV’mi analiz et</button><button className="ghost" onClick={demo}>Örnek analizi göster</button></div></section>

    <section id="analyser" className="wrap analyser">
      <div className="inputCard"><div className="step">01</div><h2>CV’ni yükle</h2><p>PDF, DOCX veya TXT. JobFit metni otomatik çıkarır.</p><input ref={fileRef} className="fileInput" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={handleFile}/><button className="uploadBox" type="button" onClick={()=>fileRef.current?.click()} disabled={uploading}><span className="uploadIcon">↑</span><strong>{uploading?'CV okunuyor…':fileName?'Başka CV yükle':'CV dosyası seç'}</strong><small>PDF · DOCX · TXT · Maks. 8 MB</small></button>{fileName&&!uploading&&<div className="fileStatus"><div><span>✓</span><div><strong>{fileName}</strong><small>CV içeriği başarıyla okundu</small></div></div><button type="button" onClick={clearFile}>Kaldır</button></div>}{uploadError&&<div className="uploadError">{uploadError}</div>}<div className="orLine"><span>veya metni düzenle / yapıştır</span></div><textarea value={cv} onChange={e=>setCv(e.target.value)} placeholder="CV içeriği burada görünecek..."/></div>
      <div className="inputCard"><div className="step">02</div><h2>İş ilanı</h2><p>LinkedIn/Kariyer linkini veya ilan açıklamasını ekle.</p><textarea value={job} onChange={e=>changeJob(e.target.value)} placeholder="https://www.linkedin.com/jobs/view/... veya ilan açıklaması..."/>{isUrl(job)&&!jobError&&<div className="jobStatus">↗ URL algılandı — ilan detayları alınacak.</div>}{jobLoading&&<div className="jobStatus">İlan okunuyor…</div>}{jobSource&&jobText&&<div className="jobStatus ok">✓ {jobSource} içeriği alındı ({jobText.length.toLocaleString('tr-TR')} karakter)</div>}{jobError&&<div className="uploadError"><strong>URL skorlanmadı.</strong><br/>{jobError}</div>}</div>
    </section>
    <div className="wrap actionRow"><button className="analyseBtn" disabled={!ready||jobLoading} onClick={run}>{jobLoading?'İlan okunuyor…':'İlanı oku ve karşılaştır'} <span>→</span></button></div>

    {jobDetails&&<section className="wrap jobPreview"><div className="sectionHead"><div><div className="eyebrow">İLAN OKUMASI</div><h2>JobFit ilandan bunları aldı</h2></div><span className={jobStructured?'quality goodQ':'quality warnQ'}>{jobStructured?'Yapılandırılmış veri':'Sınırlı veri'}</span></div>{detailRows.length>0&&<div className="detailGrid">{detailRows.map(([k,v])=><div className="detailItem" key={k}><small>{k}</small><strong>{v}</strong></div>)}</div>}{jobDetails.description&&<details className="jobDescription" open><summary>İlan açıklaması</summary><p>{jobDetails.description}</p></details>}{jobDetails.responsibilities&&<details className="jobDescription"><summary>Sorumluluklar</summary><p>{jobDetails.responsibilities}</p></details>}{jobDetails.qualifications&&<details className="jobDescription"><summary>Nitelikler</summary><p>{jobDetails.qualifications}</p></details>}{!jobStructured&&<div className="dataWarning">LinkedIn bu ilanda bize yalnızca sınırlı açık veri verdi. JobFit gördüğü bilgileri gösteriyor; göremediği bir gereksinimi uydurmuyor.</div>}</section>}

    {result&&<section className="wrap results"><div className="scoreCard"><div className="scoreRing"><strong>{result.score==null?'—':result.score}</strong><span>/100</span></div><div><div className="eyebrow">JOBFIT SKORU</div><h2>{verdict}</h2><p>Skor artık sayfadaki tüm kelimelerden değil, ilanda gerçekten tanınan iş gereksinimlerinden hesaplanıyor.</p></div></div><div className="checkCard"><div className="sectionHead"><div><div className="eyebrow">GEREKSİNİM CHECKLIST</div><h2>CV ↔ İlan karşılaştırması</h2></div><span>{result.items.filter(x=>x.status==='match').length}/{result.items.length} eşleşme</span></div>{result.items.length?result.items.map(item=><div className={`checkRow ${item.status}`} key={item.id}><span className="checkIcon">{item.status==='match'?'✓':'×'}</span><div><strong>{item.label}</strong><small>{item.status==='match'?'CV’de kanıt bulundu':'CV’de açık karşılık bulunamadı'}</small></div><b>{item.status==='match'?'UYGUN':'KONTROL'}</b></div>):<div className="dataWarning">{result.message}</div>}</div><div className="nextCard"><div><small>SONRAKİ ADIM</small><h3>Eksik kalan maddelere göre CV’ni yeniden yaz</h3><p>Bir sonraki aşamada yalnızca gerçek deneyimlerinden yararlanarak ilana özel ATS CV oluşturacağız.</p></div><button disabled>Yakında</button></div></section>}
    <footer className="wrap">JobFit · Türkiye için geliştiriliyor</footer>
  </main>
}
