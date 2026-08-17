function decodeEntities(text = '') {
  return text
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
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  ).trim()
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
  return null
}

function extractStructuredJob(html) {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1].trim())
      const job = findJobPosting(parsed)
      if (!job) continue
      const parts = [
        job.title,
        job.hiringOrganization?.name,
        job.description,
        job.qualifications,
        job.responsibilities,
        job.skills,
        job.experienceRequirements,
        job.educationRequirements,
      ].filter(Boolean)
      const text = cleanHtml(parts.join(' '))
      if (text.length > 180) return text
    } catch {}
  }
  return ''
}

function extractMeta(html) {
  const values = []
  const patterns = [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ]
  for (const pattern of patterns) {
    const m = html.match(pattern)
    if (m?.[1]) values.push(m[1])
  }
  return cleanHtml(values.join(' '))
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
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return Response.json({ error: `İlan sayfasına erişilemedi (${response.status}). İlan açıklamasını yapıştırabilirsin.` }, { status: 422 })
    }

    const html = await response.text()
    let text = extractStructuredJob(html)
    if (!text) text = extractMeta(html)

    if (text.length < 120) {
      return Response.json({ error: 'Bu site ilan metnini otomatik paylaşmıyor. İlan açıklamasını kopyalayıp yapıştır.' }, { status: 422 })
    }

    return Response.json({ text: text.slice(0, 30000), source: parsed.hostname.replace(/^www\./, '') })
  } catch (error) {
    return Response.json({ error: 'İlan URL’si okunamadı. İlan açıklamasını yapıştırabilirsin.' }, { status: 500 })
  }
}
