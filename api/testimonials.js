import { getSupabasePublicConfig, sendJson } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const { config, missing } = getSupabasePublicConfig()
  if (missing.length) {
    console.error('Published testimonials are unavailable because Supabase is not configured:', missing.join(', '))
    return sendJson(res, 503, { error: 'Stories are temporarily unavailable.' })
  }

  try {
    const url = new URL(`${config.SUPABASE_URL}/rest/v1/testimonials`)
    url.searchParams.set('select', 'id,name,relationship,story,rating,location,created_at')
    url.searchParams.set('is_published', 'eq.true')
    url.searchParams.set('order', 'created_at.desc')
    url.searchParams.set('limit', '5')
    const response = await fetch(url, {
      headers: {
        apikey: config.SUPABASE_API_KEY,
      },
    })
    if (!response.ok) {
      const detail = await response.text()
      console.error('Supabase testimonials query failed:', response.status, detail)
      return sendJson(res, 502, { error: 'Stories are temporarily unavailable.' })
    }
    return sendJson(res, 200, { testimonials: await response.json() })
  } catch (error) {
    console.error('Unable to load published testimonials:', error)
    return sendJson(res, 502, { error: 'Stories are temporarily unavailable.' })
  }
}
