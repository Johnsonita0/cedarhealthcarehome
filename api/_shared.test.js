import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { enforcePublicFormSecurity, getCareRequestRecipients, sendEmail } from './_shared.js'

const environmentKeys = [
  'PUBLIC_SITE_URL',
  'PUBLIC_SITE_ALLOWED_ORIGINS',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]
const previousEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]))
const previousFetch = globalThis.fetch

function configureEnvironment() {
  process.env.PUBLIC_SITE_URL = 'https://www.cedarhealthcarehome.com'
  delete process.env.PUBLIC_SITE_ALLOWED_ORIGINS
  process.env.SUPABASE_URL = 'https://cedar-test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-secret'
}

function createRequest(origin = 'https://www.cedarhealthcarehome.com') {
  return {
    headers: {
      ...(origin ? { origin } : {}),
      'x-forwarded-for': '203.0.113.8',
    },
    socket: {},
  }
}

function createResponse() {
  return {
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    setHeader(name, value) {
      this.headers[name] = value
      return this
    },
    end(body) {
      this.body = body
    },
  }
}

afterEach(() => {
  for (const key of environmentKeys) {
    if (previousEnvironment[key] === undefined) delete process.env[key]
    else process.env[key] = previousEnvironment[key]
  }
  globalThis.fetch = previousFetch
})

test('rejects absent and untrusted origins before calling the rate limiter', async () => {
  configureEnvironment()
  globalThis.fetch = () => assert.fail('Rate limiter should not be called for a rejected origin')

  for (const origin of ['', 'https://attacker.example']) {
    const response = createResponse()
    assert.equal(await enforcePublicFormSecurity(createRequest(origin), response, {
      endpoint: 'subscribe',
      maxRequests: 5,
      windowSeconds: 3600,
    }), false)
    assert.equal(response.statusCode, 403)
  }
})

test('passes a keyed client bucket to Supabase and allows requests under the limit', async () => {
  configureEnvironment()
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://cedar-test.supabase.co/rest/v1/rpc/consume_api_rate_limit')
    assert.equal(options.method, 'POST')
    const body = JSON.parse(options.body)
    assert.match(body.p_bucket_key, /^[a-f0-9]{64}$/)
    assert.equal(body.p_max_requests, 5)
    assert.equal(body.p_window_seconds, 900)
    return { ok: true, json: async () => true }
  }

  const response = createResponse()
  assert.equal(await enforcePublicFormSecurity(createRequest(), response, {
    endpoint: 'request-care',
    maxRequests: 5,
    windowSeconds: 900,
  }), true)
  assert.equal(response.statusCode, undefined)
})

test('returns 429 and a retry delay when the rate limit is exceeded', async () => {
  configureEnvironment()
  globalThis.fetch = async () => ({ ok: true, json: async () => false })

  const response = createResponse()
  assert.equal(await enforcePublicFormSecurity(createRequest(), response, {
    endpoint: 'subscribe',
    maxRequests: 5,
    windowSeconds: 3600,
  }), false)
  assert.equal(response.statusCode, 429)
  assert.equal(response.headers['Retry-After'], '3600')
})

test('keeps the Cedar Gmail audit copy hidden from the visible recipient list', () => {
  const recipients = getCareRequestRecipients({
    CARE_REQUEST_RECIPIENT: 'cedarhealthcarehome@gmail.com;team@example.com',
  })

  assert.equal(recipients.bcc, 'cedarhealthcarehome@gmail.com')
  assert.ok(recipients.to.includes('team@example.com'))
  assert.ok(!recipients.to.some((address) => address.toLowerCase() === recipients.bcc))
})

test('sends the admin copy using BCC rather than CC', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails')
    const body = JSON.parse(options.body)
    assert.deepEqual(body.to, ['admin@cedarhealthcarehome.com'])
    assert.equal(body.bcc, 'cedarhealthcarehome@gmail.com')
    assert.equal(body.cc, undefined)
    return { ok: true }
  }

  assert.equal(await sendEmail({
    RESEND_API_KEY: 'test-key',
    RESEND_FROM_EMAIL: 'support@cedarhealthcarehome.com',
  }, {
    to: ['admin@cedarhealthcarehome.com'],
    bcc: 'cedarhealthcarehome@gmail.com',
    subject: 'Test',
    html: '<p>Test</p>',
  }), true)
})
