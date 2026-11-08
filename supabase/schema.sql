create table if not exists public.care_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  contact text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonial_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  relationship text not null,
  story text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  relationship text not null,
  story text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.care_requests enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.testimonial_submissions enable row level security;
alter table public.testimonials enable row level security;

revoke all on public.care_requests from anon, authenticated;
revoke all on public.newsletter_subscribers from anon, authenticated;
revoke all on public.testimonial_submissions from anon, authenticated;
revoke all on public.testimonials from anon, authenticated;
grant all on public.care_requests to service_role;
grant all on public.newsletter_subscribers to service_role;
grant all on public.testimonial_submissions to service_role;
grant all on public.testimonials to service_role;
