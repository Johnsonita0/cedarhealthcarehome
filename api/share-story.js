import { escapeHtml, getResendConfig, getSupabaseConfig, insertRow, isHoneypotFilled, sendEmail, sendJson } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (isHoneypotFilled(body)) return sendJson(res, 200, { ok: true, notificationSent: true })
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const relationship = typeof body.relationship === 'string' ? body.relationship.trim() : ''
  const story = typeof body.story === 'string' ? body.story.trim() : ''
  if (!name || name.length > 120 || !relationship || relationship.length > 120 || !story || story.length > 2000) {
    return sendJson(res, 400, { error: 'Please complete each field before sending your story.' })
  }

  const { config: supabase, missing: missingSupabase } = getSupabaseConfig()
  if (missingSupabase.length) {
    console.error('Story submission Supabase configuration is incomplete:', missingSupabase.join(', '))
    return sendJson(res, 503, { error: 'Story submissions are not available right now. Please call Cedar Healthcare.' })
  }

  try {
    await insertRow(supabase, 'testimonial_submissions', { name, relationship, story })
  } catch (error) {
    console.error('Unable to save story submission:', error)
    return sendJson(res, 502, { error: 'We could not save your story. Please try again later.' })
  }

  const { config: resend, missing: missingResend } = getResendConfig({ recipient: true })
  if (missingResend.length) {
    console.error('Story submission email configuration is incomplete:', missingResend.join(', '))
    return sendJson(res, 200, { ok: true, notificationSent: false })
  }

  const emailHtml = `<h2>New story to review</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Relationship:</strong> ${escapeHtml(relationship)}</p><p><strong>Story:</strong></p><p>${escapeHtml(story).replace(/\n/g, '<br>')}</p><p>This story has not been published.</p>`
  const notificationSent = await sendEmail(resend, {
    to: resend.CARE_REQUEST_RECIPIENT,
    subject: `A Cedar family story from ${name}`,
    html: emailHtml,
  })
  return sendJson(res, 200, { ok: true, notificationSent })
}
