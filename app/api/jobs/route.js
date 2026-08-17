function decodeHtml(text=''){
  return text
    .replace(/&amp;/g,'&').replace(/&nbsp;/g,' ')
    .replace(/&#39;/g,"'").replace(/&quot;/g,'"')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
}
function cleanHtml(html=''){
  return decodeHtml(String(html)).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()
}
function roleFromCv(cv=''){
  const t=cv.toLowerCase()
  if(t.includes('mechanical team lead'))return 'Mechanical Team Lead'
  if(t.includes('senior mechanical'))return 'Senior Mechanical Engineer'
  if(t.includes('piping')&&t.includes('hvac'))return 'Senior Mechanical Engineer'
  if(t.includes('piping'))return 'Piping Engineer'
  if(t.includes('hvac'))return 'HVAC Engineer'
  if(t.includes('software'))return 'Software Engineer'
  return 'Engineer'
}
const STOP=new Set('the and for with from your our you are this that into will have has had job role team work working years year experience experienced required preferred looking company position based about who what where when how'.split(' '))
function terms(text=''){return [...new Set(text.toLowerCase().replace(/[^a-z0-9+#&.\-\s]/g,' ').split(/\s+/).filter(x=>x.length>2&&!STOP.has(x)&&!/^\d+$/.test(x)))]}
function scoreJob(cv,job,role){
  const cvSet=new Set(terms(cv));const jobTerms=terms(`${job.title} ${job.description||''}`);let hit=0
  for(const t of jobTerms)if(cvSet.has(t))hit++
  const semantic=[['piping',['piping','pipe']],['hvac',['hvac','duct','ventilation']],['marine',['marine','ship','vessel','yacht','shipyard','naval','offshore']],['leadership',['lead','manager','coordination','subcontractor']],['design',['design','engineering','cadmatic','autocad','p&id']],['class',['solas','classification','dnv','lloyd','bv']]]
  let bonus=0;const c=cv.toLowerCase(),j=`${job.title} ${job.description||''}`.toLowerCase()
  for(const[,keys]of semantic){if(keys.some(k=>c.includes(k))&&keys.some(k=>j.includes(k)))bonus+=8}
  const roleWords=role.toLowerCase().split(/\s+/).filter(x=>x.length>4)
  if(roleWords.some(x=>job.title.toLowerCase().includes(x)))bonus+=12
  const base=jobTerms.length?Math.min(55,Math.round(hit/jobTerms.length*100)):0
  return Math.max(1,Math.min(99,base+bonus))
}
function attr(block,name){const m=block.match(new RegExp(`${name}=["']([^"']+)["']`,'i'));return m?.[1]?decodeHtml(m[1]):''}
function between(block,re){const m=block.match(re);return m?.[1]?cleanHtml(m[1]):''}
function parseLinkedInCards(html){
  const blocks=[...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>m[1])
  const jobs=[]
  for(const b of blocks){
    const title=between(b,/<h3[^>]*class=["'][^"']*base-search-card__title[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)||between(b,/<span[^>]*class=["'][^"']*sr-only[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)
    const company=between(b,/<h4[^>]*class=["'][^"']*base-search-card__subtitle[^"']*["'][^>]*>([\s\S]*?)<\/h4>/i)
    const location=between(b,/<span[^>]*class=["'][^"']*job-search-card__location[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)
    const linkMatch=b.match(/<a[^>]*class=["'][^"']*base-card__full-link[^"']*["'][^>]*>/i)
    let url=linkMatch?attr(linkMatch[0],'href'):''
    if(url)url=url.replace(/&amp;/g,'&')
    const date=attr(b.match(/<time[^>]*>/i)?.[0]||'','datetime')
    if(title&&url)jobs.push({title,company,location,source:'LinkedIn',url,date,description:''})
  }
  return jobs
}
async function fetchLinkedIn(role,country,start=0){
  try{
    const url=`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(country)}&start=${start}`
    const r=await fetch(url,{cache:'no-store',headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/139 Safari/537.36','Accept-Language':'en-US,en;q=0.9'},signal:AbortSignal.timeout(10000)})
    if(!r.ok)return[]
    return parseLinkedInCards(await r.text())
  }catch{return[]}
}
async function enrichLinkedIn(job){
  try{
    const r=await fetch(job.url,{cache:'no-store',redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/139 Safari/537.36','Accept-Language':'en-US,en;q=0.9'},signal:AbortSignal.timeout(7000)})
    if(!r.ok)return job
    const html=await r.text()
    const desc=between(html,/<div[^>]*class=["'][^"']*show-more-less-html__markup[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
    return {...job,description:(desc||'').slice(0,2500)}
  }catch{return job}
}
export async function POST(request){
  try{
    const{cv,country='Netherlands'}=await request.json()
    if(!cv||cv.length<40)return Response.json({error:'Önce CV yükle.'},{status:400})
    const role=roleFromCv(cv)
    const searches=[role]
    if(role!=='Senior Mechanical Engineer')searches.push('Senior Mechanical Engineer')
    searches.push('Mechanical Engineer')
    const batches=[]
    for(const q of [...new Set(searches)]){
      const [a,b]=await Promise.all([fetchLinkedIn(q,country,0),fetchLinkedIn(q,country,25)])
      batches.push(...a,...b)
    }
    const seen=new Set()
    let jobs=batches.filter(j=>{
      const k=(j.url||`${j.title}|${j.company}|${j.location}`).toLowerCase()
      if(seen.has(k))return false;seen.add(k);return true
    })
    jobs=jobs.map(j=>({...j,fit:scoreJob(cv,j,role)})).sort((a,b)=>b.fit-a.fit).slice(0,16)
    jobs=await Promise.all(jobs.map(enrichLinkedIn))
    jobs=jobs.map(j=>({...j,fit:scoreJob(cv,j,role)})).sort((a,b)=>b.fit-a.fit).slice(0,10)
    const q=encodeURIComponent(role),loc=encodeURIComponent(country)
    const sources=[
      {name:'LinkedIn',url:`https://www.linkedin.com/jobs/search/?keywords=${q}&location=${loc}`},
      {name:'Indeed',url:`https://www.indeed.com/jobs?q=${q}&l=${loc}`},
      {name:'Kariyer.net',url:`https://www.kariyer.net/is-ilanlari?kw=${q}`}
    ]
    return Response.json({role,country,jobs,sources,limited:jobs.length<10,count:jobs.length})
  }catch(e){
    return Response.json({error:'İlanlar alınamadı.',detail:String(e?.message||e)},{status:500})
  }
}
