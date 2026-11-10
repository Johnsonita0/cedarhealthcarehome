import {
  escapeHtml,
  getPublicSiteUrl,
  getResendConfig,
  getSupabasePublicConfig,
  renderBrandedEmail,
  renderNewsletterContent,
  sendJson,
  validEmail,
} from './_shared.js'

const cedarAdminUserId = 'bb9a9a8e-83b6-4c7a-b101-dcfdfe9fd20c'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const { config: supabase, missing: missingSupabase } = getSupabasePublicConfig()
  if (missingSupabase.length) return sendJson(res, 503, { error: 'Admin email sending is not configured.' })

  const token = typeof req.headers.authorization === 'string'
    ? req.headers.authorization.replace(/^Bearer\s+/i, '')
    : ''
  if (!token) return sendJson(res, 401, { error: 'Sign in to continue.' })

  try {
    const authResponse = await fetch(`${supabase.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: supabase.SUPABASE_API_KEY,
        Authorization: `Bearer ${token}`,
      },
    })
    if (!authResponse.ok) return sendJson(res, 401, { error: 'Your admin session has expired. Sign in again.' })
    const user = await authResponse.json()
    if (user.id !== cedarAdminUserId) return sendJson(res, 403, { error: 'Admin access is required.' })

    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const recipient = typeof body.recipient === 'string' ? body.recipient.trim().toLowerCase() : ''
    if (!validEmail(recipient)) return sendJson(res, 400, { error: 'Enter a valid recipient email address.' })

    const { config: resend, missing: missingResend } = getResendConfig()
    if (missingResend.length) return sendJson(res, 503, { error: 'Email sending is not configured.' })

    const siteUrl = getPublicSiteUrl()
    const welcomeEmail = renderBrandedEmail({
      preheader: 'Thoughtful care tips and occasional updates from Cedar.',
      title: 'Welcome to Cedar Healthcare',
      intro: 'Thanks for joining our community.',
      content: '<p style="margin:0;color:#405548;font-size:15px;line-height:1.75">We’ll share occasional care tips and thoughtful updates. You can unsubscribe at any time by replying to this email.</p>',
      button: { url: `${siteUrl}/#services`, label: 'Explore our services' },
    })

    const careEmail = renderBrandedEmail({
      preheader: 'New care request from Alex Preview',
      title: 'New care request',
      intro: 'A family has contacted Cedar Healthcare through the website.',
      content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="padding:9px 0;color:#6b7b70;font-size:13px;font-weight:bold">Name</td><td style="padding:9px 0;color:#203529;font-size:13px">Alex Preview</td></tr><tr><td style="padding:9px 0;color:#6b7b70;font-size:13px;font-weight:bold">Contact</td><td style="padding:9px 0;color:#203529;font-size:13px">alex.preview@example.com</td></tr><tr><td style="padding:9px 0;color:#6b7b70;font-size:13px;font-weight:bold">WhatsApp</td><td style="padding:9px 0;color:#203529;font-size:13px">+12025550143</td></tr></table><h2 style="margin:20px 0 8px;color:#294836;font-size:16px">Message</h2><p style="margin:0;color:#405548;font-size:14px;line-height:1.75;white-space:pre-wrap">This is a sample care request for previewing the email template.</p>`,
      button: { url: `${siteUrl}/admin`, label: 'Open admin inbox' },
    })

    const storyEmail = renderBrandedEmail({
      preheader: 'A new testimonial from Jamie Preview is waiting for review.',
      title: 'A story is ready for review',
      intro: 'A Cedar family has shared their experience. This story is not published until an admin approves it.',
      content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="padding:8px 0;color:#6b7b70;font-size:13px;font-weight:bold">Name</td><td style="padding:8px 0;color:#203529;font-size:13px">Jamie Preview</td></tr><tr><td style="padding:8px 0;color:#6b7b70;font-size:13px;font-weight:bold">Relationship</td><td style="padding:8px 0;color:#203529;font-size:13px">Family member</td></tr><tr><td style="padding:8px 0;color:#6b7b70;font-size:13px;font-weight:bold">Rating</td><td style="padding:8px 0;color:#b48626;font-size:13px">★★★★★ (5/5)</td></tr><tr><td style="padding:8px 0;color:#6b7b70;font-size:13px;font-weight:bold">Location</td><td style="padding:8px 0;color:#203529;font-size:13px">Chicago, IL</td></tr></table><h2 style="margin:20px 0 8px;color:#294836;font-size:16px">Story</h2><p style="margin:0;color:#405548;font-size:14px;line-height:1.75;white-space:pre-wrap">This is a sample family story for previewing the email template.</p>`,
      button: { url: `${siteUrl}/admin`, label: 'Review testimonial' },
    })

    const newsletterSubject = 'A little care in your inbox'
    const newsletterEmail = renderBrandedEmail({
      preheader: newsletterSubject,
      title: newsletterSubject,
      intro: 'A thoughtful update from Cedar Healthcare.',
      content: `${renderNewsletterContent('This is a sample Cedar update for previewing the newsletter email template.\n\n**Thoughtful care, close to home.**')}<p style="margin:24px 0 0;color:#718077;font-size:12px;line-height:1.6">To stop receiving Cedar updates, reply to this email and let us know.</p>`,
      button: { url: siteUrl, label: 'Visit Cedar Healthcare' },
    })

    const emails = [
      { to: [recipient], subject: '[TEST] Welcome to Cedar Healthcare', html: welcomeEmail },
      { to: [recipient], subject: '[TEST] New care request', html: careEmail },
      { to: [recipient], subject: '[TEST] A story is ready for review', html: storyEmail },
      { to: [recipient], subject: `[TEST] ${newsletterSubject}`, html: newsletterEmail },
    ].map((email) => ({ from: resend.RESEND_FROM_EMAIL, ...email }))

    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resend.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emails),
    })
    if (!response.ok) {
      const detail = await response.text()
      console.error('Resend template test failed:', response.status, detail)
      return sendJson(res, 502, { error: 'The test emails could not be sent. Check the Resend configuration and try again.' })
    }

    return sendJson(res, 200, { ok: true, sent: emails.length, recipient })
  } catch (error) {
    console.error('Admin email template test failed:', error)
    return sendJson(res, 502, { error: 'The test emails could not be sent. Please try again.' })
  }
}
