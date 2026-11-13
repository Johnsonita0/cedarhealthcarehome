import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import acceptCaregiverApplication from './api/accept-caregiver-application.js'
import caregiverApplication from './api/caregiver-application.js'
import verifyCaregiverApplication from './api/verify-caregiver-application.js'

const caregiverApiHandlers = {
  '/api/caregiver-application': caregiverApplication,
  '/api/verify-caregiver-application': verifyCaregiverApplication,
  '/api/accept-caregiver-application': acceptCaregiverApplication,
}

function caregiverApiDevPlugin() {
  return {
    name: 'cedar-caregiver-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname
        const handler = caregiverApiHandlers[pathname]
        if (!handler) return next()

        res.status = function setStatus(status) {
          this.statusCode = status
          return this
        }

        if (req.method === 'POST') {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const requestBody = Buffer.concat(chunks).toString('utf8')
          try {
            req.body = requestBody ? JSON.parse(requestBody) : {}
          } catch {
            res.status(400).setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'Request body must be valid JSON.' }))
            return
          }
        }

        try {
          await handler(req, res)
        } catch (error) {
          console.error('Local caregiver API request failed:', error)
          if (!res.headersSent) res.statusCode = 500
          if (!res.writableEnded) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'The caregiver service could not complete the request.' }))
          }
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const serverEnv = {
    SUPABASE_URL: ['SUPABASE_URL', 'VITE_SUPABASE_URL'],
    SUPABASE_SERVICE_ROLE_KEY: ['SUPABASE_SERVICE_ROLE_KEY'],
    SUPABASE_PUBLISHABLE_KEY: ['SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY'],
    RESEND_API_KEY: ['RESEND_API_KEY'],
    RESEND_FROM_EMAIL: ['RESEND_FROM_EMAIL'],
    CARE_REQUEST_RECIPIENT: ['CARE_REQUEST_RECIPIENT'],
    PUBLIC_SITE_URL: ['PUBLIC_SITE_URL'],
    EMAIL_LOGO_URL: ['EMAIL_LOGO_URL'],
  }

  for (const [name, aliases] of Object.entries(serverEnv)) {
    if (process.env[name]) continue
    const value = aliases.map((alias) => env[alias]).find(Boolean)
    if (value) process.env[name] = value
  }

  return { plugins: [react(), caregiverApiDevPlugin()] }
})
