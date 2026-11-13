export function sendJson(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export function isHoneypotFilled(body) {
  return typeof body.website === 'string' && body.website.trim().length > 0
}

export function isCaregiverReference(value) {
  return typeof value === 'string' && /^CED-\d{2}-[A-Z0-9]{5}-[A-Z0-9]{5}$/i.test(value)
}

const cedarNotificationRecipients = [
  'cedarhealthcarehome@gmail.com',
  'support@cedarhealthcarehome.com',
  'admin@cedarhealthcarehome.com',
  'info@cedarhealthcarehome.com',
]

export function getSupabaseConfig() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  const missing = []
  if (!SUPABASE_URL) missing.push('SUPABASE_URL')
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  return { config: { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, missing }
}

export function getSupabasePublicConfig() {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env
  const missing = []
  if (!SUPABASE_URL) missing.push('SUPABASE_URL')
  if (!SUPABASE_PUBLISHABLE_KEY) missing.push('SUPABASE_PUBLISHABLE_KEY')

  return {
    config: {
      SUPABASE_URL,
      SUPABASE_API_KEY: SUPABASE_PUBLISHABLE_KEY,
    },
    missing,
  }
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

export function getCareRequestRecipients(config) {
  const configuredRecipients = typeof config.CARE_REQUEST_RECIPIENT === 'string'
    ? config.CARE_REQUEST_RECIPIENT.split(/[;,]/).map((recipient) => recipient.trim()).filter(Boolean)
    : []
  const invalidRecipients = configuredRecipients.filter((recipient) => !validEmail(recipient))
  if (invalidRecipients.length) {
    throw new Error(`CARE_REQUEST_RECIPIENT contains ${invalidRecipients.length} invalid email address(es).`)
  }

  const recipients = new Map(cedarNotificationRecipients.map((recipient) => [recipient.toLowerCase(), recipient]))
  for (const recipient of configuredRecipients) recipients.set(recipient.toLowerCase(), recipient)
  return [...recipients.values()]
}

export function getPublicSiteUrl() {
  const defaultUrl = 'https://www.cedarhealthcarehome.com'
  try {
    const url = new URL(process.env.PUBLIC_SITE_URL || defaultUrl)
    return ['https:', 'http:'].includes(url.protocol) ? url.origin : defaultUrl
  } catch {
    return defaultUrl
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

function safeWebUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export function renderNewsletterContent(value) {
  return String(value || '').split(/\r?\n/).map((line) => {
    const image = /^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/.exec(line.trim())
    if (image && safeWebUrl(image[2])) {
      return `<p style="margin:20px 0;text-align:center"><img src="${escapeHtml(image[2])}" alt="${escapeHtml(image[1])}" style="display:block;width:100%;max-width:560px;height:auto;margin:0 auto;border:0;border-radius:8px" /></p>`
    }
    if (!line.trim()) return '<div style="height:8px;line-height:8px">&nbsp;</div>'

    let text = escapeHtml(line)
    text = text.replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, (match, label, href) => (
      safeWebUrl(href) ? `<a href="${escapeHtml(href)}" style="color:#176132;text-decoration:underline">${label}</a>` : match
    ))
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    return `<p style="margin:0 0 12px;color:#405548;font-size:15px;line-height:1.75">${text}</p>`
  }).join('')
}

export function renderBrandedEmail({ preheader = '', title, intro = '', content = '', button = null }) {
  const siteUrl = getPublicSiteUrl()
  const logoUrl = safeWebUrl(process.env.EMAIL_LOGO_URL || `${siteUrl}/cedar-logo.jpeg`)
  const servicesUrl = `${siteUrl}/#services`
  const contactUrl = `${siteUrl}/#contact`
  const storiesUrl = `${siteUrl}/#stories`
  const privacyUrl = `${siteUrl}/privacy`
  const termsUrl = `${siteUrl}/terms`
  const socialMessage = encodeURIComponent(`Learn more about Cedar Healthcare: ${siteUrl}`)
  const socialLinks = [
    { href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`, label: 'f', name: 'Facebook' },
    { href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`, label: 'in', name: 'LinkedIn' },
    { href: `https://wa.me/?text=${socialMessage}`, label: 'wa', name: 'WhatsApp' },
  ]
  const buttonUrl = button ? safeWebUrl(button.url) : ''
  const buttonHtml = button && buttonUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px auto 4px"><tr><td align="center" bgcolor="#07520b" style="border-radius:5px"><a href="${escapeHtml(buttonUrl)}" style="display:inline-block;padding:13px 22px;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none">${escapeHtml(button.label)}</a></td></tr></table>`
    : ''

  const footerLinks = [
    { href: siteUrl, label: 'Visit Cedar' },
    { href: servicesUrl, label: 'Our services' },
    { href: storiesUrl, label: 'Stories' },
    { href: contactUrl, label: 'Request care' },
    { href: privacyUrl, label: 'Privacy policy' },
    { href: termsUrl, label: 'Terms of use' },
  ].map((item) => `<a href="${escapeHtml(item.href)}" style="display:inline-block;margin:4px 7px;color:#315b40;font-size:12px;font-weight:bold;text-decoration:none">${item.label}</a>`).join('')
  const contactEmails = cedarNotificationRecipients.map((email) => (
    `<a href="mailto:${escapeHtml(email)}" style="display:inline-block;margin:4px 7px;color:#315b40;font-size:12px;text-decoration:none">${escapeHtml(email)}</a>`
  )).join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6f2;font-family:Arial,Helvetica,sans-serif;color:#203529">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6f2">
    <tr><td align="center" style="padding:28px 14px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;border:1px solid #e1e9e2;border-radius:10px;background:#ffffff">
        <tr><td align="center" style="padding:28px 24px 20px;border-bottom:1px solid #edf1ed">
          ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" width="174" alt="Cedar Healthcare, LLC" style="display:block;width:174px;max-width:80%;height:auto;margin:0 auto;border:0">` : ''}
        </td></tr>
        <tr><td style="padding:30px 32px 32px">
          <h1 style="margin:0 0 14px;color:#1b382b;font-family:Arial,sans-serif;font-size:25px;line-height:1.25;font-weight:600">${escapeHtml(title)}</h1>
          ${intro ? `<p style="margin:0 0 20px;color:#66766b;font-size:15px;line-height:1.7">${escapeHtml(intro)}</p>` : ''}
          ${content}${buttonHtml}
        </td></tr>
        <tr><td align="center" style="padding:22px 24px 25px;border-top:1px solid #edf1ed;background:#f8faf8">
          <div style="margin-bottom:13px">${footerLinks}</div>
          <div style="margin:0 0 13px">${socialLinks.map((item) => `<a href="${escapeHtml(item.href)}" aria-label="${escapeHtml(item.name)}" style="display:inline-block;width:29px;height:29px;margin:0 5px;border:1px solid #cddbd0;border-radius:50%;color:#356346;font-size:11px;font-weight:bold;line-height:29px;text-align:center;text-decoration:none">${item.label}</a>`).join('')}</div>
          <p style="margin:0 0 6px;color:#6d7b71;font-size:11px;line-height:1.6">Cedar Healthcare, LLC · 7412 N Western Ave, Chicago, IL 60645</p>
          <p style="margin:0 0 6px;color:#6d7b71;font-size:11px;line-height:1.6"><a href="tel:+12242043281" style="color:#315b40;text-decoration:none">224-204-3281</a></p>
          <p style="margin:0;color:#6d7b71;font-size:11px;line-height:1.6">${contactEmails}</p>
          <p style="margin:12px 0 0;color:#9aa59c;font-size:10px">© ${new Date().getFullYear()} Cedar Healthcare, LLC</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
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
