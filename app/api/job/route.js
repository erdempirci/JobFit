function decodeEntities(text = '') {
  return String(text)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function cleanHtml(html = '') {
  return decodeEntities(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
  ).trim()
}

function textValue(value) {
  if (!value) return ''
  if (typeof value === 'string') return cleanHtml(value)
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(' · ')
  if (typeof value === 'object') {
    return cleanHtml(value.name || value.value || value.description || '')
  }
  return cleanHtml(String(value))
}

function findJobPosting(value) {
  if (!value) return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item)
      if (found) return found
    }
    return null
  }
  if (typeof value !== 'object') return null
  const type = value['@type']
  if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) return value
  if (value['@graph']) return findJobPosting(value['@graph'])
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      const found = findJobPosting(child)
      if (found) return found
    }
  }
  return null
}

function locationValue(job) {
  const locations = Array.isArray(job?.jobLocation) ? job.jobLocation : [job?.jobLocation].filter(Boolean)
  return locations.map(item => {
    const a = item?.address || item
    return [a?.addressLocality, a?.addressRegion, a?.addressCountry?.name || a?.addressCountry]
      .filter(Boolean).join(', ')
  }).filter(Boolean).join(' · ')
}

function structuredFromJob(job) {
  const details = {
    title: textValue(job?.title),
    company: textValue(job?.hiringOrganization?.name),
    location: locationValue(job),
    employmentType: textValue(job?.employmentType),
    datePosted: textValue(job?.datePosted),
    validThrough: textValue(job?.validThrough),
    description: textValue(job?.description),
    responsibilities: textValue(job?.responsibilities),
    qualifications: textValue(job?.qualifications),
    skills: textValue(job?.skills),
    experience: textValue(job?.experienceRequirements),
    education: textValue(job?.educationRequirements),
    industry: textValue(job?.industry),
  }

  const text = [
    details.title,
    details.company,
    details.description,
    details.responsibilities,
    details.qualifications,
    details.skills,
    details.experience,
    details.education,
    details.industry,
  ].filter(Boolean).join('\n\n')

  return { details, text: cleanHtml(text) }
}

function extractStructuredJob(html) {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1].trim())
      const job = findJobPosting(parsed)
      if (!job) continue
      const result = structuredFromJob(job)
      if (result.text.length > 180) return result
    } catch {}
  }
  return null
}

function metaValue(html, key, attr = 'property') {
  const re1 = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["']`, 'i')
  return cleanHtml(html.match(re1)?.[1] || html.match(re2)?.[1] || '')
}

function extractMeta(html) {
  const title = metaValue(html, 'og:title') || cleanHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
  const description = metaValue(html, 'og:description') || metaValue(html, 'description', 'name')
  const details = { title, company: '', location: '', employmentType: '', datePosted: '', validThrough: '', description, responsibilities: '', qualifications: '', skills: '', experience: '', education: '', industry: '' }
  return { details, text: cleanHtml([title, description].filter(Boolean).join('\n\n')) }
}

export async function POST(request) {
  try {
    const { url } = await request.json()
    if (!url || !/^https?:\/\//i.test(url)) {
      return Response.json({ error: 'Geçerli bir ilan URL’si gir.' }, { status: 400 })
    }

    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return Response.json({ error: 'Desteklenmeyen URL.' }, { status: 400 })
    }

    const response = await fetch(url, {
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobFit/1.0; +https://job-fit-one.vercel.app)',
        'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8,nl;q=0.7',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return Response.json({ error: `İlan sayfasına erişilemedi (${response.status}). İlan açıklamasını yapıştırabilirsin.` }, { status: 422 })
    }

    const html = await response.text()
    const structured = extractStructuredJob(html)
    const result = structured || extractMeta(html)

    if (!result.text || result.text.length < 120) {
      return Response.json({ error: 'Bu site ilan detaylarını otomatik paylaşmıyor. İlan açıklamasını kopyalayıp yapıştır.' }, { status: 422 })
    }

    return Response.json({
      text: result.text.slice(0, 30000),
      details: result.details,
      source: parsed.hostname.replace(/^www\./, ''),
      structured: Boolean(structured),
    })
  } catch {
    return Response.json({ error: 'İlan URL’si okunamadı. İlan açıklamasını yapıştırabilirsin.' }, { status: 500 })
  }
}
