# Cedar Healthcare public website

Responsive React + Vite implementation of the Cedar public website design, with a private admin console for care requests, page content, testimonials, and newsletters. Form submissions are validated and saved by server-side Vercel functions; Resend sends branded notifications when configured.

The client source is organized into `src/components/`, `src/pages/`, and `src/styles/`.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev` from the repository root to start the Vite development server and local caregiver application/status APIs.

The public pages need the public Supabase URL and publishable key to load published stories and CMS content. Form submissions require the server-side Supabase service-role setting; email notifications and newsletter sends also need the server-side Resend settings below.
Use `npx vercel dev` when you need to run all Vercel API functions locally.

## Supabase and Resend setup

1. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Cedar Supabase project's SQL editor. This single SQL file contains the full schema, idempotent table updates, and backfills for existing records, including caregiver reference codes/gender and the nullable `care_requests.whatsapp_number` column. It converts a legacy UUID `site_content.id` to the integer singleton ID expected by the admin console while preserving and merging its saved draft/published content. It also creates the content image bucket; images are public to view and only the allowlisted admin can upload or update them.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. Set `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` for server-side email. Use the verified `support@cedarhealthcarehome.com` address as `RESEND_FROM_EMAIL`. `CARE_REQUEST_RECIPIENT` accepts comma- or semicolon-separated addresses; the Cedar Gmail, support, admin, and info inboxes are always included for care requests, testimonial reviews, and caregiver application notifications. `PUBLIC_SITE_URL` and `EMAIL_LOGO_URL` optionally override the defaults used in branded email footers and caregiver status links.
3. Keep the Supabase service role key and Resend key on the server. Do not add a `VITE_` prefix to either secret.
4. Confirm the administrator's Supabase Auth user ID is `bb9a9a8e-83b6-4c7a-b101-dcfdfe9fd20c`. The console has no public sign-up flow; the UI, API, and RLS allow only this exact identity.
5. Supabase Auth verifies and stores passwords server-side. Do not hash passwords in the browser or store them in the app; never put the service-role key in a `VITE_` variable.
6. Verify the sender domain/address in Resend before sending live mail.
7. To connect the client portal when its URL is available, set `VITE_CLIENT_APP_URL`.

The service-role key is used only by Vercel server routes and never goes to the browser. Anonymous users cannot read or write care requests, subscriber records, or unpublished stories. RLS lets the allowlisted admin UID manage those records and lets the public read only published testimonials/content. The `testimonials` table should contain only stories Cedar has permission to publish.

## Deploy

Import the repository root as the Vercel project root, add the server-side environment variables in the Vercel project settings, then deploy. Vercel serves the Vite build and the functions in `api/`.
