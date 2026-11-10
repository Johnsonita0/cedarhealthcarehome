# Cedar Healthcare public website

Responsive React + Vite implementation of the Cedar public website design, with a private admin console for care requests, page content, testimonials, and newsletters. Form submissions are validated and saved by server-side Vercel functions; Resend sends branded notifications when configured.

The client source is organized into `src/components/`, `src/pages/`, and `src/styles/`.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev` to start the Vite development server.

The public pages need the public Supabase URL and publishable key to load published stories and CMS content. Form submissions require the server-side Supabase service-role setting; email notifications and newsletter sends also need the server-side Resend settings below.
Use `npx vercel dev` instead of `npm run dev` when you need the local Vercel API functions as well as the Vite page.

## Supabase and Resend setup

1. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Cedar Supabase project's SQL editor. This single SQL file contains the full schema and idempotent `ALTER TABLE` statements for existing projects, including the nullable `care_requests.whatsapp_number` column. It also creates the content image bucket; images are public to view and only the allowlisted admin can upload or update them.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. Set `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CARE_REQUEST_RECIPIENT` for admin newsletter sends and email notifications. `PUBLIC_SITE_URL` and `EMAIL_LOGO_URL` optionally override the defaults used in branded email footers.
3. Keep the Supabase service role key and Resend key on the server. Do not add a `VITE_` prefix to either secret.
4. Confirm the administrator's Supabase Auth user ID is `bb9a9a8e-83b6-4c7a-b101-dcfdfe9fd20c`. The console has no public sign-up flow; the UI, API, and RLS allow only this exact identity.
5. Supabase Auth verifies and stores passwords server-side. Do not hash passwords in the browser or store them in the app; never put the service-role key in a `VITE_` variable.
6. Verify the sender domain/address in Resend before sending live mail.
7. To connect the client portal when its URL is available, set `VITE_CLIENT_APP_URL`.

The service-role key is used only by Vercel server routes and never goes to the browser. Anonymous users cannot read or write care requests, subscriber records, or unpublished stories. RLS lets the allowlisted admin UID manage those records and lets the public read only published testimonials/content. The `testimonials` table should contain only stories Cedar has permission to publish.

## Deploy

Import the `app` folder as the Vercel project root, add the server-side environment variables in the Vercel project settings, then deploy. Vercel serves the Vite build and the functions in `api/`.
