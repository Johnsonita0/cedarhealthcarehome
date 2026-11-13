import { escapeHtml, getPublicSiteUrl, getResendConfig, getSupabaseConfig, insertRow, isHoneypotFilled, renderBrandedEmail, sendEmail, sendJson, validEmail } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (isHoneypotFilled(body)) return sendJson(res, 200, { ok: true, notificationSent: true })

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const contact = typeof body.contact === 'string' ? body.contact.trim() : ''
  const whatsappInput = typeof body.whatsappNumber === 'string' ? body.whatsappNumber.trim() : ''
  const whatsappNumber = whatsappInput.replace(/\D/g, '')
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const validWhatsapp = !whatsappInput || (
    /^[+\d\s().-]+$/.test(whatsappInput)
    && whatsappNumber.length >= 7
    && whatsappNumber.length <= 15
  )
  if (!validWhatsapp || whatsappInput.length > 25) {
    return sendJson(res, 400, { error: 'Enter a valid WhatsApp number with its country code, using 7 to 15 digits.' })
  }
  if (!name || name.length > 120 || !contact || contact.length > 160 || !message || message.length > 2000) {
    return sendJson(res, 400, { error: 'Please check your name, contact details, and message, then try again.' })
  }

  const { config: supabase, missing: missingSupabase } = getSupabaseConfig()
  if (missingSupabase.length) {
    console.error('Care request Supabase configuration is incomplete:', missingSupabase.join(', '))
    return sendJson(res, 503, { error: 'Our request form is not available right now. Please call Cedar Healthcare.' })
  }

  try {
    await insertRow(supabase, 'care_requests', { full_name: name, contact, whatsapp_number: whatsappNumber || null, message })
  } catch (error) {
    console.error('Unable to save care request:', error)
    return sendJson(res, 502, { error: 'We could not save your request. Please call Cedar Healthcare instead.' })
  }

  const { config: resend, missing: missingResend } = getResendConfig({ recipient: true })
  if (missingResend.length) {
    console.error('Care request email configuration is incomplete:', missingResend.join(', '))
    return sendJson(res, 200, { ok: true, notificationSent: false })
  }

  const emailHtml = renderBrandedEmail({
    preheader: `New care request from ${name}`,
    title: 'New care request',
    intro: 'A family has contacted Cedar Healthcare through the website.',
    content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse"><tr><td style="padding:9px 0;color:#6b7b70;font-size:13px;font-weight:bold">Name</td><td style="padding:9px 0;color:#203529;font-size:13px">${escapeHtml(name)}</td></tr><tr><td style="padding:9px 0;color:#6b7b70;font-size:13px;font-weight:bold">Contact</td><td style="padding:9px 0;color:#203529;font-size:13px">${escapeHtml(contact)}</td></tr>${whatsappNumber ? `<tr><td style="padding:9px 0;color:#6b7b70;font-size:13px;font-weight:bold">WhatsApp</td><td style="padding:9px 0;color:#203529;font-size:13px">+${escapeHtml(whatsappNumber)}</td></tr>` : ''}</table><h2 style="margin:20px 0 8px;color:#294836;font-size:16px">Message</h2><p style="margin:0;color:#405548;font-size:14px;line-height:1.75;white-space:pre-wrap">${escapeHtml(message)}</p>`,
    button: { url: `${getPublicSiteUrl()}/admin`, label: 'Open admin inbox' },
  })
  const notificationSent = await sendEmail(resend, {
    to: resend.CARE_REQUEST_RECIPIENT,
    subject: `New care request from ${name}`,
    html: emailHtml,
    replyTo: validEmail(contact) ? contact : undefined,
  })

  return sendJson(res, 200, { ok: true, notificationSent })
}
