# Cedar Healthcare public website

Responsive React + Vite implementation of the Cedar public website design. The Vercel API functions save care requests, newsletter subscriptions, and unpublished story submissions in Supabase; Resend handles email notifications. Only published testimonials are returned to the public site.

The client source is organized into `src/components/`, `src/pages/`, and `src/styles/`.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm run dev` to start the Vite development server.

The public pages work without credentials. Form submissions and published stories require the server-side settings below.
Use `npx vercel dev` instead of `npm run dev` when you need the local Vercel API functions as well as the Vite page.

## Supabase and Resend setup

1. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Cedar Supabase project's SQL editor.
2. Copy `.env.example` to `.env.local` and set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CARE_REQUEST_RECIPIENT`.
3. Keep the Supabase service role key and Resend key on the server. Do not add a `VITE_` prefix to either secret.
4. Verify the sender domain/address in Resend before sending live mail.
5. To connect the client portal when its URL is available, set `VITE_CLIENT_APP_URL`.

The service-role key is used only by Vercel API routes. Row-level security is enabled and anonymous/authenticated roles have no access to the request, subscriber, or testimonial tables. The `testimonials` table should contain only stories Cedar has permission to publish; set `is_published` to `true` after review.

## Deploy

Import the `app` folder as the Vercel project root, add the server-side environment variables in the Vercel project settings, then deploy. Vercel serves the Vite build and the functions in `api/`.
