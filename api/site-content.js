import { getSupabaseConfig, sendJson } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const { config, missing } = getSupabaseConfig()
  if (missing.length) return sendJson(res, 503, { error: 'Page content is temporarily unavailable.' })

  try {
    const url = new URL(`${config.SUPABASE_URL}/rest/v1/site_content`)
    url.searchParams.set('select', 'published')
    url.searchParams.set('id', 'eq.1')
    url.searchParams.set('limit', '1')
    const response = await fetch(url, {
      headers: {
        apikey: config.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })
    if (!response.ok) {
      console.error('Supabase published content query failed:', response.status)
      return sendJson(res, 502, { error: 'Page content is temporarily unavailable.' })
    }
    const [row] = await response.json()
    return sendJson(res, 200, { content: row?.published || null })
  } catch (error) {
    console.error('Unable to load published page content:', error)
    return sendJson(res, 502, { error: 'Page content is temporarily unavailable.' })
  }
}