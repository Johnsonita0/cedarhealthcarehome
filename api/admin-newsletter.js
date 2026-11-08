import { escapeHtml, getResendConfig, getSupabaseConfig, sendJson } from './_shared.js'

const batchSize = 100

async function sendBatch(apiKey, emails) {
  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emails),
  })
  if (!response.ok) {
    const detail = await response.text()
    console.error('Resend newsletter batch failed:', response.status, detail)
    throw new Error('Email delivery failed. Check the Resend configuration and try again.')
  }
}

async function getSubscribers(config) {
  const subscribers = []
  for (let offset = 0; offset < 10000; offset += 1000) {
    const url = new URL(`${config.SUPABASE_URL}/rest/v1/newsletter_subscribers`)
    url.searchParams.set('select', 'email')
    url.searchParams.set('order', 'created_at.asc')
    const response = await fetch(url, {
      headers: {
        apikey: config.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
        Range: `${offset}-${offset + 999}`,
      },
    })
    if (!response.ok) throw new Error('Subscriber list could not be loaded.')
    const page = await response.json()
    subscribers.push(...page)
    if (page.length < 1000) return subscribers
  }
  throw new Error('The audience is larger than the current send limit. Contact support before sending.')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const { config: supabase, missing: missingSupabase } = getSupabaseConfig()
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  if (missingSupabase.length || !publishableKey) {
    return sendJson(res, 503, { error: 'Admin email sending is not configured.' })
  }

  const token = typeof req.headers.authorization === 'string'
    ? req.headers.authorization.replace(/^Bearer\s+/i, '')
    : ''
  if (!token) return sendJson(res, 401, { error: 'Sign in to continue.' })

  try {
    const authResponse = await fetch(`${supabase.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${token}`,
      },
    })
    if (!authResponse.ok) return sendJson(res, 401, { error: 'Your admin session has expired. Sign in again.' })
    const user = await authResponse.json()
    if (user.id !== 'bb9a9a8e-83b6-4c7a-b101-dcfdfe9fd20c') {
      return sendJson(res, 403, { error: 'Admin access is required.' })
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const action = body.action
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const message = typeof body.body === 'string' ? body.body.trim() : ''
    if (!['test', 'send'].includes(action)) return sendJson(res, 400, { error: 'Choose a valid send action.' })
    if (!subject || subject.length > 200 || !message || message.length > 10000) {
      return sendJson(res, 400, { error: 'Add a subject and message before sending.' })
    }
    if (action === 'test' && !user.email) return sendJson(res, 400, { error: 'Your admin account needs an email address for a test send.' })

    const { config: resend, missing: missingResend } = getResendConfig()
    if (missingResend.length) return sendJson(res, 503, { error: 'Newsletter email sending is not configured.' })

    const html = `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#203529"><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p><p style="margin-top:32px;color:#718077;font-size:12px">To stop receiving Cedar updates, reply to this email and let us know.</p></div>`
    const from = resend.RESEND_FROM_EMAIL
    if (action === 'test') {
      await sendBatch(resend.RESEND_API_KEY, [{ from, to: [user.email], subject: `[Test] ${subject}`, html }])
      return sendJson(res, 200, { ok: true, sent: 1 })
    }

    const subscribers = await getSubscribers(supabase)
    if (!subscribers.length) return sendJson(res, 400, { error: 'There are no subscribers to send to.' })

    let sent = 0
    for (let index = 0; index < subscribers.length; index += batchSize) {
      const batch = subscribers.slice(index, index + batchSize).map(({ email }) => ({
        from,
        to: [email],
        subject,
        html,
      }))
      await sendBatch(resend.RESEND_API_KEY, batch)
      sent += batch.length
    }

    const historyResponse = await fetch(`${supabase.SUPABASE_URL}/rest/v1/newsletter_campaigns`, {
      method: 'POST',
      headers: {
        apikey: supabase.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${supabase.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ subject, body: message, recipient_count: sent }),
    })
    if (!historyResponse.ok) {
      console.error('Newsletter was sent but campaign history could not be saved:', historyResponse.status)
      return sendJson(res, 200, { ok: true, sent, historySaved: false })
    }
    return sendJson(res, 200, { ok: true, sent, historySaved: true })
  } catch (error) {
    console.error('Admin newsletter send failed:', error)
    return sendJson(res, 502, { error: error.message || 'The newsletter could not be sent.' })
  }
}