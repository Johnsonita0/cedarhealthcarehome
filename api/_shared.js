export function sendJson(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export function isHoneypotFilled(body) {
  return typeof body.website === 'string' && body.website.trim().length > 0
}

export function getSupabaseConfig() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  const missing = []
  if (!SUPABASE_URL) missing.push('SUPABASE_URL')
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  return { config: { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, missing }
}

export function getResendConfig({ recipient = false } = {}) {
  const { RESEND_API_KEY, RESEND_FROM_EMAIL, CARE_REQUEST_RECIPIENT } = process.env
  const missing = []
  if (!RESEND_API_KEY) missing.push('RESEND_API_KEY')
  if (!RESEND_FROM_EMAIL) missing.push('RESEND_FROM_EMAIL')
  if (recipient && !CARE_REQUEST_RECIPIENT) missing.push('CARE_REQUEST_RECIPIENT')

  return {
    config: { RESEND_API_KEY, RESEND_FROM_EMAIL, CARE_REQUEST_RECIPIENT },
    missing,
  }
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

export async function insertRow(config, table, row, { query = '', prefer = 'return=minimal' } = {}) {
  const response = await fetch(`${config.SUPABASE_URL}/rest/v1/${table}${query}`, {
    method: 'POST',
    headers: {
      apikey: config.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    body: JSON.stringify(row),
  })
  if (!response.ok) {
    const detail = await response.text()
    console.error(`Supabase insert failed for ${table}:`, response.status, detail)
    throw new Error('The request could not be saved.')
  }
}

export async function sendEmail(config, { to, subject, html, replyTo }) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.RESEND_FROM_EMAIL,
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })
    if (!response.ok) {
      const detail = await response.text()
      console.error('Resend email delivery failed:', response.status, detail)
      return false
    }
    return true
  } catch (error) {
    console.error('Resend email delivery failed:', error)
    return false
  }
}

export function validEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
