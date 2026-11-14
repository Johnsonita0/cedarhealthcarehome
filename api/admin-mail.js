import { randomUUID } from 'node:crypto'
import { renderBrandedEmail, renderNewsletterContent, sendJson, validEmail } from './_shared.js'

const cedarAdminUserId = 'bb9a9a8e-83b6-4c7a-b101-dcfdfe9fd20c'
const inboxDefinitions = [
  { address: 'info@cedarhealthcarehome.com', name: 'Cedar Information', fromName: 'Cedar Healthcare' },
  { address: 'admin@cedarhealthcarehome.com', name: 'Cedar Admin', fromName: 'Cedar Healthcare Admin' },
  { address: 'support@cedarhealthcarehome.com', name: 'Cedar Support', fromName: 'Cedar Healthcare Support' },
]
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function queryValue(req, key) {
  const value = req.query?.[key]
  return Array.isArray(value) ? value[0] : value
}

async function authenticateAdmin(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !publishableKey) {
    sendJson(res, 503, { error: 'Admin email access is not configured.' })
    return null
  }

  const token = typeof req.headers.authorization === 'string'
    ? req.headers.authorization.replace(/^Bearer\s+/i, '')
    : ''
  if (!token) {
    sendJson(res, 401, { error: 'Sign in to continue.' })
    return null
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`,
    },
  })
  if (!authResponse.ok) {
    sendJson(res, 401, { error: 'Your admin session has expired. Sign in again.' })
    return null
  }

  const user = await authResponse.json()
  if (user.id !== cedarAdminUserId) {
    sendJson(res, 403, { error: 'Admin access is required.' })
    return null
  }
  return user
}

async function resendRequest(path, { method = 'GET', body, idempotencyKey } = {}) {
  const headers = { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  const response = await fetch(`https://api.resend.com${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const responseText = await response.text()
  let result = {}
  try {
    result = responseText ? JSON.parse(responseText) : {}
  } catch {
    result = {}
  }
  if (!response.ok) {
    const error = new Error(result.message || `The email service returned status ${response.status}.`)
    error.status = response.status
    throw error
  }
  return result
}

async function listResendInboxes() {
  const inboxes = []
  let after = ''
  do {
    const query = new URLSearchParams({ limit: '100' })
    if (after) query.set('after', after)
    const response = await resendRequest(`/inboxes?${query.toString()}`)
    inboxes.push(...(Array.isArray(response.data) ? response.data : []))
    after = response.has_more && response.data?.length
      ? response.data[response.data.length - 1].id
      : ''
  } while (after)
  return inboxes
}

function publicMailbox(definition, inbox) {
  return {
    address: definition.address,
    name: inbox?.name || definition.name,
    fromName: inbox?.from_name || definition.fromName,
    configured: Boolean(inbox),
    unread: Number(inbox?.unread) || 0,
    lastReceived: inbox?.last_received || null,
  }
}

async function getMailboxes() {
  const inboxes = await listResendInboxes()
  return inboxDefinitions.map((definition) => {
    const match = inboxes.find((inbox) => inbox.email_address?.toLowerCase() === definition.address)
    return publicMailbox(definition, match || null)
  })
}

function getInboxDefinition(address) {
  return inboxDefinitions.find((definition) => definition.address === String(address || '').toLowerCase())
}

function getThreadPath(address, threadId) {
  return `/inboxes/${encodeURIComponent(address)}/threads/${encodeURIComponent(threadId)}`
}

function getMessageHtml(subject, message, intro) {
  return renderBrandedEmail({
    preheader: subject,
    title: subject,
    intro,
    content: renderNewsletterContent(message),
  })
}

export default async function handler(req, res) {
  try {
    const user = await authenticateAdmin(req, res)
    if (!user) return
    res.setHeader('Cache-Control', 'no-store')

    if (!process.env.RESEND_API_KEY) {
      return sendJson(res, 503, { error: 'Add RESEND_API_KEY to the server environment to connect the mailboxes.' })
    }

    if (req.method === 'GET') {
      const action = queryValue(req, 'action')
      if (action === 'mailboxes') {
        return sendJson(res, 200, { mailboxes: await getMailboxes() })
      }

      const address = String(queryValue(req, 'address') || '').toLowerCase()
      if (!getInboxDefinition(address)) return sendJson(res, 400, { error: 'Choose a Cedar mail address.' })

      if (action === 'threads') {
        const requestedFolder = queryValue(req, 'folder')
        const folder = requestedFolder === 'archive' || requestedFolder === 'sent' ? requestedFolder : 'inbox'
        const query = new URLSearchParams({ folders: folder, limit: '100' })
        const result = await resendRequest(`/inboxes/${encodeURIComponent(address)}/threads?${query.toString()}`)
        return sendJson(res, 200, { threads: result.data || [], hasMore: Boolean(result.has_more) })
      }

      if (action === 'thread') {
        const threadId = queryValue(req, 'threadId')
        if (typeof threadId !== 'string' || !idPattern.test(threadId)) {
          return sendJson(res, 400, { error: 'Choose a valid email thread.' })
        }
        const threadPath = getThreadPath(address, threadId)
        await resendRequest(threadPath, { method: 'PATCH', body: { read: true } })
        const result = await resendRequest(`${threadPath}/emails?limit=100`)
        return sendJson(res, 200, { emails: result.data || [], hasMore: Boolean(result.has_more) })
      }

      return sendJson(res, 400, { error: 'Choose a valid mail action.' })
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return sendJson(res, 405, { error: 'Method not allowed.' })
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {}

    const address = typeof body.address === 'string' ? body.address.toLowerCase() : ''
    if (!getInboxDefinition(address)) return sendJson(res, 400, { error: 'Choose a Cedar mail address.' })

    if (body.action === 'archive' || body.action === 'restore') {
      if (typeof body.threadId !== 'string' || !idPattern.test(body.threadId)) {
        return sendJson(res, 400, { error: 'Choose a valid email thread.' })
      }
      const folder = body.action === 'archive' ? 'archive' : 'inbox'
      const result = await resendRequest(getThreadPath(address, body.threadId), {
        method: 'PATCH',
        body: { folder },
      })
      return sendJson(res, 200, { ok: true, folder: result.folder })
    }

    if (body.action === 'reply') {
      if (typeof body.threadId !== 'string' || !idPattern.test(body.threadId)
        || typeof body.emailId !== 'string' || !idPattern.test(body.emailId)) {
        return sendJson(res, 400, { error: 'Choose a valid email to reply to.' })
      }
      const message = typeof body.message === 'string' ? body.message.trim() : ''
      if (!message || message.length > 10000) {
        return sendJson(res, 400, { error: 'Write a reply of no more than 10,000 characters.' })
      }
      const html = getMessageHtml('A message from Cedar Healthcare', message, 'Thank you for contacting Cedar Healthcare.')
      const path = `${getThreadPath(address, body.threadId)}/emails/${encodeURIComponent(body.emailId)}/reply`
      const result = await resendRequest(path, {
        method: 'POST',
        body: { html, text: message },
        idempotencyKey: `cedar-reply-${randomUUID()}`,
      })
      return sendJson(res, 200, { ok: true, emailId: result.id })
    }

    if (body.action === 'compose') {
      const recipient = typeof body.to === 'string' ? body.to.trim() : ''
      const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
      const message = typeof body.message === 'string' ? body.message.trim() : ''
      if (!validEmail(recipient)) return sendJson(res, 400, { error: 'Enter a valid recipient email address.' })
      if (!subject || subject.length > 200 || /[\r\n]/.test(subject)) {
        return sendJson(res, 400, { error: 'Add a subject of no more than 200 characters.' })
      }
      if (!message || message.length > 10000) {
        return sendJson(res, 400, { error: 'Write a message of no more than 10,000 characters.' })
      }

      const html = getMessageHtml(subject, message, 'A message from Cedar Healthcare.')
      const draft = await resendRequest(`/inboxes/${encodeURIComponent(address)}/drafts`, {
        method: 'POST',
        body: { to: [recipient], subject, html, text: message },
        idempotencyKey: `cedar-compose-${randomUUID()}`,
      })
      if (!draft.id) throw new Error('The email draft was created without an ID, so it could not be sent.')

      try {
        const sent = await resendRequest(`/inboxes/${encodeURIComponent(address)}/drafts/${encodeURIComponent(draft.id)}/send`, {
          method: 'POST',
          idempotencyKey: `cedar-send-${randomUUID()}`,
        })
        return sendJson(res, 200, { ok: true, emailId: sent.id })
      } catch (error) {
        console.error('Cedar email draft could not be sent:', error)
        return sendJson(res, 502, { error: 'The branded draft was saved in Resend, but sending failed. Open the inbox in Resend to review it.' })
      }
    }

    return sendJson(res, 400, { error: 'Choose a valid mail action.' })
  } catch (error) {
    console.error('Cedar admin mail request failed:', error)
    return sendJson(res, error.status === 401 ? 401 : 502, {
      error: error.message || 'The email service could not complete this request.',
    })
  }
}
