import { sendJson } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !publishableKey) return sendJson(res, 503, { error: 'Page content is temporarily unavailable.' })

  try {
    const url = new URL(`${supabaseUrl}/rest/v1/site_content`)
    url.searchParams.set('select', 'published')
    url.searchParams.set('id', 'eq.1')
    url.searchParams.set('limit', '1')
    const response = await fetch(url, {
      headers: {
        apikey: publishableKey,
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