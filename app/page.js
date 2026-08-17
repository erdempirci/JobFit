'use client'

import { useMemo, useRef, useState } from 'react'

const DIMENSIONS = [
  { id:'education', label:'Mezuniyet / eğitim', job:['bachelor','bsc','master','msc','degree','university','engineering degree','naval architecture','mechanical engineering'], cv:['bsc','bachelor','university','naval architecture','marine engineering','mechanical engineering'] },
  { id:'experience', label:'Deneyim / kıdem', job:['senior','lead','years experience','year experience','experienced','principal'], cv:['senior','lead','team lead','project responsible','2014','2017','2018','2019','2020','2021','2022'] },
  { id:'sector', label:'Sektör tecrübesi', job:['marine','ship','shipyard','vessel','yacht','offshore','naval','maritime'], cv:['marine','ship','shipyard','vessel','yacht','naval','ferry','trawler'] },
  { id:'technical', label:'Teknik uzmanlık', job:['piping','pipe','hvac','duct','p&id','mechanical design','3d routing','3d model','commissioning'], cv:['piping','pipe','hvac','duct','p&id','mechanical design','3d routing','3d model','commissioning'] },
  { id:'software', label:'Program / yazılım bilgisi', job:['cadmatic','autocad','plant 3d','rhinoceros','aveva','e3d','navisworks','solidworks','revit'], cv:['cadmatic','autocad','plant 3d','rhinoceros','aveva','e3d','navisworks','solidworks','revit'] },
  { id:'language', label:'Yabancı dil', job:['english','dutch','german','fluent','language','communication skills'], cv:['english','turkish','good good good','excellent'] },
  { id:'leadership', label:'Liderlik / koordinasyon', job:['lead team','team lead','team management','coordinate','coordination','subcontractor','project management','stakeholder'], cv:['leading a team','team lead','coordinating','coordination','subcontractor','project manager','work schedules'] },
  { id:'class', label:'Class / kural / standart', job:['classification','class society','dnv','lloyd','bureau veritas','bv','solas','imo','regulation','rules'], cv:['classification','dnv','lloyd','bureau veritas','bv','solas','imo','rules and regulations'] },
  { id:'documentation', label:'Teknik dokümantasyon', job:['documentation','isometric','spool','material list','technical drawing','drawing','reporting','engineering documentation'], cv:['documentation','isometric','spool','material list','technical drawing','reporting','engineering documentation'] },
  { id:'location', label:'Lokasyon / çalışma uygunluğu', job:['rotterdam','netherlands','holland','onsite','on-site','hybrid','remote','relocation','work permit','eu'], cv:['turkey','non-eu','driver','karamürsel'] },
]

function normalize(text='') { return String(text).toLocaleLowerCase('en-US').replace(/\s+/g,' ') }
function hasAny(text,list){const n=normalize(text);return list.some(x=>n.includes(normalize(x)))}
function isUrl(text){return /^https?:\/\/\S+$/i.test(text.trim())}

function buildChecklist(cv,job){
  const items=DIMENSIONS.map(d=>{
    const requested=hasAny(job,d.job)
    const matched=hasAny(cv,d.cv)
    let status='not_required'
    if(requested&&matched) status='match'
    else if(requested&&!matched) status='missing'
    else if(!requested&&matched) status='profile_plus'
    return {...d,status,requested,matched}
  })
  const relevant=items.filter(x=>x.requested)
  const matchedRelevant=relevant.filter(x=>x.status==='match').length
  const score=relevant.length?Math.round(matchedRelevant/relevant.length*100):null
  return {score,items,relevantCount:relevant.length,matchedRelevant}
}

const sampleCv=`BSc Naval Architecture and Marine Engineering. Mechanical Team Lead. Senior mechanical design engineer. Piping, HVAC, P&ID, Cadmatic, AutoCAD, 3D routing, classification societies, SOLAS, subcontractor coordination, technical documentation, English.`
const sampleJob=`Senior Mechanical Design Engineer for marine projects in Rotterdam. Bachelor degree required. Strong English. Cadmatic and AutoCAD. Piping, HVAC and P&ID experience. Team coordination, class rules and engineering documentation.`

export default function Home(){
  const [cv,setCv]=useState(''); const [job,setJob]=useState(''); const [jobText,setJobText]=useState(''); const [jobDetails,setJobDetails]=useState(null); const [result,setResult]=useState(null)
  const [fileName,setFileName]=useState(''); const [uploading,setUploading]=useState(false); const [uploadError,setUploadError]=useState(''); const [jobLoading,setJobLoading]=useState(false); const [jobError,setJobError]=useState(''); const [jobSource,setJobSource]=useState(''); const [jobStructured,setJobStructured]=useState(false)
  const fileRef=useRef(null); const ready=useMemo(()=>cv.trim().length>40&&(isUrl(job)||job.trim().length>40),[cv,job])

  async function resolveJob(){
    if(!isUrl(job)){setJobDetails({description:job});setJobText(job);setJobStructured(false);return job}
    setJobLoading(true);setJobError('');setJobSource('');setJobDetails(null)
    try{const r=await fetch('/api/job',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:job.trim()})});const d=await r.json();if(!r.ok)throw new Error(d.error||'İlan okunamadı.');setJobText(d.text);setJobDetails(d.details||null);setJobSource(d.source||'İlan sayfası');setJobStructured(Boolean(d.structured));return d.text}
    catch(e){setJobText('');setJobDetails(null);setJobError(e.message||'İlan URL’si okunamadı.');return ''}finally{setJobLoading(false)}
  }
  async function run(){if(!ready||jobLoading)return;setResult(null);const resolved=await resolveJob();if(!resolved||resolved.length<40)return;setResult(buildChecklist(cv,resolved))}
  function demo(){setCv(sampleCv);setJob(sampleJob);setJobText(sampleJob);setJobDetails({title:'Senior Mechanical Design Engineer',company:'Demo Marine',location:'Rotterdam',description:sampleJob});setFileName('Örnek CV');setJobSource('Örnek ilan');setJobStructured(true);setResult(buildChecklist(sampleCv,sampleJob))}
  async function handleFile(e){const file=e.target.files?.[0];if(!file)return;setUploading(true);setUploadError('');setFileName(file.name);try{const form=new FormData();form.append('file',file);const r=await fetch('/api/extract',{method:'POST',body:form});const d=await r.json();if(!r.ok)throw new Error(d.error||'CV okunamadı.');setCv(d.text);setFileName(d.fileName||file.name);setResult(null)}catch(err){setUploadError(err.message||'CV yüklenirken hata oluştu.');setFileName('')}finally{setUploading(false);if(fileRef.current)fileRef.current.value=''}}
  function clearFile(){setCv('');setFileName('');setUploadError('');setResult(null)}
  function changeJob(v){setJob(v);setJobText('');setJobDetails(null);setJobError('');setJobSource('');setJobStructured(false);setResult(null)}

  const verdict=result?.score==null?'İlandan yeterli gereksinim çıkarılamadı.':result.score>=80?'Güçlü eşleşme — başvur.':result.score>=60?'İyi eşleşme — birkaç noktayı kontrol et.':result.score>=40?'Kısmi eşleşme.':'Düşük eşleşme.'
  const detailRows=jobDetails?[['Pozisyon',jobDetails.title],['Şirket',jobDetails.company],['Lokasyon',jobDetails.location],['Çalışma türü',jobDetails.employmentType],['Sektör',jobDetails.industry],['Deneyim',jobDetails.experience],['Eğitim',jobDetails.education],['Beceriler',jobDetails.skills]].filter(([,v])=>v):[]

  return <main>
    <nav className="nav wrap"><div className="brand"><span className="brandMark">J</span>JobFit</div><span className="beta">MVP</span></nav>
    <section className="hero wrap"><div className="eyebrow">AI destekli iş başvuru copilotu</div><h1>İlanı oku. CV’ni <span>madde madde karşılaştır.</span></h1><p>CV ve ilan ayrı ayrı okunur; ardından 10 başlıkta uygunluk kontrolü yapılır.</p><div className="heroActions"><button className="primary" onClick={()=>document.getElementById('analyser')?.scrollIntoView({behavior:'smooth'})}>CV’mi analiz et</button><button className="ghost" onClick={demo}>Örnek analizi göster</button></div></section>
    <section id="analyser" className="wrap analyser">
      <div className="inputCard"><div className="step">01</div><h2>CV’ni yükle</h2><p>PDF, DOCX veya TXT. JobFit metni otomatik çıkarır.</p><input ref={fileRef} className="fileInput" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={handleFile}/><button className="uploadBox" type="button" onClick={()=>fileRef.current?.click()} disabled={uploading}><span className="uploadIcon">↑</span><strong>{uploading?'CV okunuyor…':fileName?'Başka CV yükle':'CV dosyası seç'}</strong><small>PDF · DOCX · TXT · Maks. 8 MB</small></button>{fileName&&!uploading&&<div className="fileStatus"><div><span>✓</span><div><strong>{fileName}</strong><small>CV içeriği başarıyla okundu</small></div></div><button type="button" onClick={clearFile}>Kaldır</button></div>}{uploadError&&<div className="uploadError">{uploadError}</div>}<div className="orLine"><span>veya metni düzenle / yapıştır</span></div><textarea value={cv} onChange={e=>setCv(e.target.value)} placeholder="CV içeriği burada görünecek..."/></div>
      <div className="inputCard"><div className="step">02</div><h2>İş ilanı</h2><p>LinkedIn/Kariyer linkini veya ilan açıklamasını ekle.</p><textarea value={job} onChange={e=>changeJob(e.target.value)} placeholder="https://www.linkedin.com/jobs/view/... veya ilan açıklaması..."/>{isUrl(job)&&!jobError&&<div className="jobStatus">↗ URL algılandı — ilan detayları alınacak.</div>}{jobLoading&&<div className="jobStatus">İlan okunuyor…</div>}{jobSource&&jobText&&<div className="jobStatus ok">✓ {jobSource} içeriği alındı ({jobText.length.toLocaleString('tr-TR')} karakter)</div>}{jobError&&<div className="uploadError"><strong>URL skorlanmadı.</strong><br/>{jobError}</div>}</div>
    </section>
    <div className="wrap actionRow"><button className="analyseBtn" disabled={!ready||jobLoading} onClick={run}>{jobLoading?'İlan okunuyor…':'İlanı oku ve karşılaştır'} <span>→</span></button></div>
    {jobDetails&&<section className="wrap jobPreview"><div className="sectionHead"><div><div className="eyebrow">İLAN OKUMASI</div><h2>JobFit ilandan bunları aldı</h2></div><span className={jobStructured?'quality goodQ':'quality warnQ'}>{jobStructured?'Yapılandırılmış veri':'Sınırlı veri'}</span></div>{detailRows.length>0&&<div className="detailGrid">{detailRows.map(([k,v])=><div className="detailItem" key={k}><small>{k}</small><strong>{v}</strong></div>)}</div>}{jobDetails.description&&<details className="jobDescription" open><summary>İlan açıklaması</summary><p>{jobDetails.description}</p></details>}{jobDetails.responsibilities&&<details className="jobDescription"><summary>Sorumluluklar</summary><p>{jobDetails.responsibilities}</p></details>}{jobDetails.qualifications&&<details className="jobDescription"><summary>Nitelikler</summary><p>{jobDetails.qualifications}</p></details>}{!jobStructured&&<div className="dataWarning">LinkedIn bu ilanda yalnızca sınırlı açık veri sağladı. JobFit göremediği bilgiyi uydurmaz.</div>}</section>}
    {result&&<section className="wrap results"><div className="scoreCard"><div className="scoreRing"><strong>{result.score==null?'—':result.score}</strong><span>/100</span></div><div><div className="eyebrow">JOBFIT SKORU</div><h2>{verdict}</h2><p>Puan yalnızca ilanda gerçekten talep edilen başlıklardan hesaplanır. Alttaki 10 satır ise tam kontrol tablosudur.</p></div></div><div className="checkCard"><div className="sectionHead"><div><div className="eyebrow">10 MADDELİK CHECKLIST</div><h2>CV ↔ İlan uygunluk kontrolü</h2></div><span>{result.matchedRelevant}/{result.relevantCount} gerekli madde uygun</span></div>{result.items.map(item=>{const label=item.status==='match'?'UYGUN':item.status==='missing'?'EKSİK':item.status==='profile_plus'?'CV’DE VAR':'İLANDA YOK';const icon=item.status==='match'||item.status==='profile_plus'?'✓':item.status==='missing'?'×':'–';return <div className={`checkRow ${item.status}`} key={item.id}><span className="checkIcon">{icon}</span><div><strong>{item.label}</strong><small>{item.status==='match'?'İlanda isteniyor ve CV’de karşılığı bulundu':item.status==='missing'?'İlanda isteniyor, CV’de açık karşılık bulunamadı':item.status==='profile_plus'?'İlanda açıkça istenmiyor ama CV’de güçlü tarafın':'İlanda bu başlık açıkça belirtilmemiş'}</small></div><b>{label}</b></div>})}</div><div className="nextCard"><div><small>SONRAKİ ADIM</small><h3>Eksik kalan maddelere göre CV’ni yeniden yaz</h3><p>Yalnızca gerçek deneyimlerinden yararlanarak ilana özel ATS CV oluşturacağız.</p></div><button disabled>Yakında</button></div></section>}
    <footer className="wrap">JobFit · Türkiye için geliştiriliyor</footer>
  </main>
}
