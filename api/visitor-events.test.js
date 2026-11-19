import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import handler, { getDeviceType } from './visitor-events.js'

const environmentKeys = ['PUBLIC_SITE_URL', 'PUBLIC_SITE_ALLOWED_ORIGINS', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const previousEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]))
const previousFetch = globalThis.fetch

function configureEnvironment() {
  process.env.PUBLIC_SITE_URL = 'https://www.cedarhealthcarehome.com'
  delete process.env.PUBLIC_SITE_ALLOWED_ORIGINS
  process.env.SUPABASE_URL = 'https://cedar-test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-secret'
}

function createRequest(method, body, headers = {}) {
  return {
    method,
    body,
    headers: {
      origin: 'https://www.cedarhealthcarehome.com',
      'x-forwarded-for': '203.0.113.8',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile',
      ...headers,
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

function setupFetch(onRequest) {
  globalThis.fetch = async (url, options) => {
    const target = new URL(url)
    if (target.pathname.endsWith('/rpc/consume_api_rate_limit')) {
      return { ok: true, json: async () => true }
    }
    return onRequest(target, options)
  }
}

afterEach(() => {
  for (const key of environmentKeys) {
    if (previousEnvironment[key] === undefined) delete process.env[key]
    else process.env[key] = previousEnvironment[key]
  }
  globalThis.fetch = previousFetch
})

test('accepts only public pages and well-formed section keys', async () => {
  configureEnvironment()
  globalThis.fetch = () => assert.fail('Invalid events must not call Supabase')

  for (const body of [
    { page: '/admin', section: null },
    { page: '/', section: 'Email person@example.com' },
  ]) {
    const response = createResponse()
    await handler(createRequest('POST', body), response)
    assert.equal(response.statusCode, 400)
  }

  const methodResponse = createResponse()
  await handler(createRequest('GET', {}), methodResponse)
  assert.equal(methodResponse.statusCode, 405)
})

test('stores anonymous daily totals with coarse location and device category only', async () => {
  configureEnvironment()
  const requests = []
  setupFetch(async (url, options) => {
    requests.push({ url, options })
    return { ok: true, text: async () => '' }
  })

  const response = createResponse()
  await handler(createRequest('POST', {
    page: '/',
    section: 'services',
  }, {
    'x-vercel-ip-country': 'US',
    'x-vercel-ip-country-region': 'IL',
  }), response)

  assert.equal(response.statusCode, 202)
  const pageViewResponse = createResponse()
  await handler(createRequest('POST', { page: '/', section: '' }), pageViewResponse)
  assert.equal(pageViewResponse.statusCode, 202)
  assert.equal(requests.length, 2)
  assert.equal(requests[0].options.method, 'POST')
  assert.equal(requests[0].url.pathname, '/rest/v1/rpc/record_visitor_analytics')

  const event = JSON.parse(requests[0].options.body)
  assert.match(event.p_visit_date, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(event.p_page, '/')
  assert.equal(event.p_section, 'services')
  assert.equal(event.p_device_type, 'mobile')
  assert.equal(event.p_country, 'US')
  assert.equal(event.p_region, 'IL')
  assert.equal(Object.keys(event).length, 6)
  assert.ok(!JSON.stringify(event).includes('203.0.113.8'))
  assert.ok(!JSON.stringify(event).includes('iPhone'))
  assert.equal(JSON.parse(requests[1].options.body).p_section, '')
})

test('rejects request methods other than POST', async () => {
  configureEnvironment()
  const response = createResponse()
  await handler(createRequest('DELETE', {}), response)
  assert.equal(response.statusCode, 405)
})

test('classifies common mobile and tablet user agents without retaining them', () => {
  assert.equal(getDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0)'), 'tablet')
  assert.equal(getDeviceType('Mozilla/5.0 (Linux; Android 13)'), 'tablet')
  assert.equal(getDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'desktop')
})
