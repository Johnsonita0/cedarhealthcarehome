import { getSupabaseConfig, isCaregiverReference, isHoneypotFilled, sendJson } from './_shared.js'

const visibleStatuses = new Set(['new', 'contacted', 'accepted'])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (isHoneypotFilled(body)) return sendJson(res, 404, { error: 'We could not find an application with that reference.' })

  const reference = typeof body.reference === 'string' ? body.reference.trim().toUpperCase() : ''
  if (!isCaregiverReference(reference)) {
    return sendJson(res, 400, { error: 'Enter the reference code from your confirmation email.' })
  }

  const { config, missing } = getSupabaseConfig()
  if (missing.length) {
    console.error('Caregiver status Supabase configuration is incomplete:', missing.join(', '))
    return sendJson(res, 503, { error: 'Status checking is not available right now. Please try again later.' })
  }

  const url = new URL(`${config.SUPABASE_URL}/rest/v1/caregiver_applications`)
  url.searchParams.set('select', 'status')
  url.searchParams.set('reference_code', `eq.${reference}`)
  url.searchParams.set('limit', '1')

  try {
    const response = await fetch(url, {
      headers: {
        apikey: config.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })
    if (!response.ok) {
      console.error('Caregiver status lookup failed:', response.status, await response.text())
      return sendJson(res, 502, { error: 'We could not check your application status. Please try again.' })
    }

    const applications = await response.json()
    if (!applications.length) {
      return sendJson(res, 404, { error: 'We could not find an application with that reference.' })
    }

    const { status } = applications[0]
    if (!visibleStatuses.has(status)) {
      console.error('Caregiver application has an unsupported status:', status)
      return sendJson(res, 500, { error: 'We could not display this application status. Please contact Cedar Healthcare.' })
    }

    return sendJson(res, 200, { ok: true, status })
  } catch (error) {
    console.error('Unable to check caregiver application status:', error)
    return sendJson(res, 502, { error: 'We could not check your application status. Please try again.' })
  }
}
