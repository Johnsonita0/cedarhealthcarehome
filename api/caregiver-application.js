import { randomBytes } from 'node:crypto'
import { escapeHtml, getPublicSiteUrl, getResendConfig, getSupabaseConfig, insertRow, isHoneypotFilled, renderBrandedEmail, sendEmail, sendJson, validEmail } from './_shared.js'

const referenceAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const allowedGenders = new Set(['Male', 'Female'])
const defaultAdminRecipient = 'cedarhealthcarehome@gmail.com'

function createReferenceCode() {
  const token = Array.from(randomBytes(10), (byte) => referenceAlphabet[byte & 31]).join('')
  const year = String(new Date().getUTCFullYear()).slice(-2)
  return `CED-${year}-${token.slice(0, 5)}-${token.slice(5)}`
}

function applicationDetails({ fullName, email, phone, gender, role, referenceCode }) {
  const rows = [
    ['Name', fullName],
    ['Email', email],
    ['WhatsApp', phone],
    ['Gender', gender],
    ['Pronouns', gender === 'Male' ? 'He/him' : 'She/her'],
    ['Care service', role],
    ['Reference', referenceCode],
  ]
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse">${rows.map(([label, value]) => `<tr><td style="padding:9px 0;color:#6b7b70;font-size:13px;font-weight:bold">${label}</td><td style="padding:9px 0;color:#203529;font-size:13px">${escapeHtml(value)}</td></tr>`).join('')}</table>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  if (isHoneypotFilled(body)) return sendJson(res, 200, { ok: true })

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const phoneDigits = phone.replace(/\D/g, '')
  const gender = typeof body.gender === 'string' ? body.gender.trim() : ''
  const role = typeof body.role === 'string' ? body.role.trim() : ''

  if (
    !fullName || fullName.length > 120
    || !validEmail(email)
    || !/^[+\d\s().-]+$/.test(phone) || phone.length > 32
    || phoneDigits.length < 7 || phoneDigits.length > 15
    || !allowedGenders.has(gender)
    || !role || role.length > 120
  ) {
    return sendJson(res, 400, { error: 'Please check your name, email, WhatsApp number, gender, and care service, then try again.' })
  }

  const { config: supabase, missing: missingSupabase } = getSupabaseConfig()
  if (missingSupabase.length) {
    console.error('Caregiver application Supabase configuration is incomplete:', missingSupabase.join(', '))
    return sendJson(res, 503, { error: 'Applications are not available right now. Please try again later.' })
  }

  const referenceCode = createReferenceCode()
  try {
    await insertRow(supabase, 'caregiver_applications', {
      reference_code: referenceCode,
      full_name: fullName,
      email,
      phone,
      gender,
      role,
      status: 'new',
    })
  } catch (error) {
    console.error('Unable to save caregiver application:', error)
    return sendJson(res, 502, { error: 'We could not save your application. Please try again later.' })
  }

  const siteUrl = getPublicSiteUrl()
  const verifyUrl = `${siteUrl}/verify?reference=${encodeURIComponent(referenceCode)}`
  const { config: resend, missing: missingResend } = getResendConfig()
  const adminRecipient = resend.CARE_REQUEST_RECIPIENT || defaultAdminRecipient
  let confirmationEmailSent = false
  let adminNotificationSent = false

  if (missingResend.length) {
    console.error('Caregiver email configuration is incomplete:', missingResend.join(', '))
  }
  if (!resend.CARE_REQUEST_RECIPIENT) console.warn('CARE_REQUEST_RECIPIENT is not configured; using the Cedar contact inbox for caregiver notifications.')
  if (!missingResend.length) {
    const applicantEmail = sendEmail(resend, {
      to: email,
      subject: 'We received your Cedar caregiver application',
      html: renderBrandedEmail({
        preheader: 'Your caregiver application has been received.',
        title: 'Application received',
        intro: `Thank you, ${fullName}. Your application has been successfully submitted and will be reviewed with care.`,
        content: `${applicationDetails({ fullName, email, phone, gender, role, referenceCode })}<p style="margin:18px 0 0;color:#405548;font-size:14px;line-height:1.75">Keep your reference number. You can use it at any time to check your application status.</p>`,
        button: { url: verifyUrl, label: 'Check application status' },
      }),
    })

    const adminEmail = sendEmail(resend, {
        to: adminRecipient,
        subject: 'New caregiver application received',
        html: renderBrandedEmail({
          preheader: `New caregiver application from ${fullName}.`,
          title: 'New caregiver application',
          intro: 'A new caregiver application was submitted on the Cedar Healthcare website.',
          content: applicationDetails({ fullName, email, phone, gender, role, referenceCode }),
          button: { url: `${siteUrl}/admin`, label: 'Open caregiver applications' },
        }),
        replyTo: email,
      })
    const sentEmails = await Promise.all([applicantEmail, adminEmail])
    confirmationEmailSent = sentEmails[0]
    adminNotificationSent = sentEmails[1]
  }

  return sendJson(res, 200, {
    ok: true,
    referenceCode,
    confirmationEmailSent,
    adminNotificationSent,
  })
}
