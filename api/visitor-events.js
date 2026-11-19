import { enforcePublicFormSecurity, getSupabaseConfig, sendJson } from './_shared.js'

const publicPages = new Set(['/', '/privacy', '/terms'])
const sectionPattern = /^[a-z0-9-]{1,60}$/

export function getDeviceType(userAgent = '') {
  if (/\biPad\b|\bTablet\b|\bPlayBook\b|\bSilk\b/i.test(userAgent)) return 'tablet'
  if (/\biPhone\b|\biPod\b|\bMobile\b|\bIEMobile\b|\bWindows Phone\b/i.test(userAgent)) return 'mobile'
  if (/\bAndroid\b/i.test(userAgent)) return 'tablet'
  return 'desktop'
}

function getLocationHeader(value, pattern) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return pattern.test(normalized) ? normalized : null
}

function getSupabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const { page, section } = req.body || {}
  if (!publicPages.has(page)
    || (section !== null && section !== undefined && section !== ''
      && (typeof section !== 'string' || !sectionPattern.test(section)))) {
    return sendJson(res, 400, { error: 'The visitor event is invalid.' })
  }

  const allowed = await enforcePublicFormSecurity(req, res, {
    endpoint: 'visitor-events',
    maxRequests: 120,
    windowSeconds: 900,
  })
  if (!allowed) return

  const { config, missing } = getSupabaseConfig()
  if (missing.length) {
    console.error('Visitor analytics configuration is incomplete:', missing.join(', '))
    return sendJson(res, 503, { error: 'Visitor analytics are temporarily unavailable.' })
  }

  const analyticsUrl = `${config.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/rpc/record_visitor_analytics`
  const headers = getSupabaseHeaders(config.SUPABASE_SERVICE_ROLE_KEY)

  try {
    const now = new Date()
    const country = getLocationHeader(req.headers['x-vercel-ip-country'], /^[A-Z]{2}$/)
    const region = getLocationHeader(req.headers['x-vercel-ip-country-region'], /^[A-Za-z0-9 -]{1,64}$/)
    const response = await fetch(analyticsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_visit_date: now.toISOString().slice(0, 10),
        p_page: page,
        p_section: section || '',
        p_device_type: getDeviceType(req.headers['user-agent']),
        p_country: country || 'ZZ',
        p_region: region || 'unknown',
      }),
    })
    if (!response.ok) {
      console.error('Visitor analytics event could not be recorded:', response.status)
      return sendJson(res, 502, { error: 'Visitor analytics are temporarily unavailable.' })
    }
    return sendJson(res, 202, { recorded: true })
  } catch (error) {
    console.error('Visitor analytics request failed:', error)
    return sendJson(res, 502, { error: 'Visitor analytics are temporarily unavailable.' })
  }
}
