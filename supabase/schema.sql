-- Cedar Healthcare Supabase schema.
-- Run in the Supabase SQL Editor. Supabase Auth and Storage are managed services;
-- this file creates the app's public tables, access policies, and image bucket.

-- Public website data and admin-managed records.
create table if not exists public.care_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  contact text not null,
  whatsapp_number text,
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

-- Editable CMS content and newsletter delivery history.
create table if not exists public.site_content (
  id integer primary key default 1 check (id = 1),
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  recipient_count integer not null default 0,
  sent_at timestamptz not null default now()
);

alter table public.care_requests enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.testimonial_submissions enable row level security;
alter table public.testimonials enable row level security;
alter table public.site_content enable row level security;
alter table public.newsletter_campaigns enable row level security;

alter table public.care_requests
  add column if not exists status text not null default 'new',
  add column if not exists whatsapp_number text;
alter table public.testimonial_submissions
  add column if not exists rating smallint not null default 5,
  add column if not exists location text;
alter table public.testimonials
  add column if not exists rating smallint not null default 5,
  add column if not exists location text,
  add column if not exists is_published boolean not null default false;

alter table public.site_content
  add column if not exists draft jsonb not null default '{}'::jsonb,
  add column if not exists published jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists published_at timestamptz;

alter table public.newsletter_campaigns
  add column if not exists subject text not null default '',
  add column if not exists body text not null default '',
  add column if not exists recipient_count integer not null default 0,
  add column if not exists sent_at timestamptz not null default now();

-- Backfill and enforce defaults for records created before these fields existed.
update public.care_requests
set status = 'new'
where status is null;
alter table public.care_requests
  alter column status set default 'new',
  alter column status set not null;
-- Older requests have no WhatsApp value; keep it null rather than assuming
-- their general contact detail is a WhatsApp number.

update public.testimonial_submissions
set rating = 5
where rating is null;
alter table public.testimonial_submissions
  alter column rating set default 5,
  alter column rating set not null;

update public.testimonials
set rating = 5
where rating is null;
update public.testimonials
set is_published = false
where is_published is null;
alter table public.testimonials
  alter column rating set default 5,
  alter column rating set not null,
  alter column is_published set default false,
  alter column is_published set not null;

update public.site_content
set draft = '{}'::jsonb
where draft is null;
update public.site_content
set published = '{}'::jsonb
where published is null;
update public.site_content
set updated_at = now()
where updated_at is null;
alter table public.site_content
  alter column draft set default '{}'::jsonb,
  alter column draft set not null,
  alter column published set default '{}'::jsonb,
  alter column published set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

update public.newsletter_campaigns
set subject = ''
where subject is null;
update public.newsletter_campaigns
set body = ''
where body is null;
update public.newsletter_campaigns
set recipient_count = 0
where recipient_count is null;
update public.newsletter_campaigns
set sent_at = now()
where sent_at is null;
alter table public.newsletter_campaigns
  alter column subject set default '',
  alter column subject set not null,
  alter column body set default '',
  alter column body set not null,
  alter column recipient_count set default 0,
  alter column recipient_count set not null,
  alter column sent_at set default now(),
  alter column sent_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'care_requests_status_check'
      and conrelid = 'public.care_requests'::regclass
  ) then
    alter table public.care_requests
      add constraint care_requests_status_check check (status in ('new', 'replied'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'testimonial_submissions_rating_check'
      and conrelid = 'public.testimonial_submissions'::regclass
  ) then
    alter table public.testimonial_submissions
      add constraint testimonial_submissions_rating_check check (rating between 1 and 5);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'testimonials_rating_check'
      and conrelid = 'public.testimonials'::regclass
  ) then
    alter table public.testimonials
      add constraint testimonials_rating_check check (rating between 1 and 5);
  end if;
end;
$$;

create or replace function public.is_cedar_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() = 'bb9a9a8e-83b6-4c7a-b101-dcfdfe9fd20c'::uuid;
$$;

revoke all on function public.is_cedar_admin() from public;
grant execute on function public.is_cedar_admin() to anon, authenticated, service_role;

-- Only server-side service_role routes may accept public form submissions.
grant usage on schema public to anon, authenticated, service_role;

revoke all on public.care_requests from public, anon, authenticated;
revoke all on public.newsletter_subscribers from public, anon, authenticated;
revoke all on public.testimonial_submissions from public, anon, authenticated;
revoke all on public.testimonials from public, anon, authenticated;
revoke all on public.site_content from public, anon, authenticated;
revoke all on public.newsletter_campaigns from public, anon, authenticated;

grant all on public.care_requests to service_role;
grant all on public.newsletter_subscribers to service_role;
grant all on public.testimonial_submissions to service_role;
grant all on public.testimonials to service_role;
grant all on public.site_content to service_role;
grant all on public.newsletter_campaigns to service_role;

grant select, update, delete on public.care_requests to authenticated;
grant select on public.newsletter_subscribers to authenticated;
grant select, update, delete on public.testimonial_submissions to authenticated;
grant select, insert, update, delete on public.testimonials to authenticated;
grant select on public.testimonials to anon;
revoke insert on public.care_requests from anon;
revoke insert on public.newsletter_subscribers from anon;
revoke insert on public.testimonial_submissions from anon;
grant select (id, published, updated_at) on public.site_content to anon;
grant select, insert, update on public.site_content to authenticated;
grant select on public.newsletter_campaigns to authenticated;

-- Replace every policy on these app-owned tables so older permissive policies
-- cannot accidentally keep granting access after this schema is rerun.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'care_requests',
        'newsletter_subscribers',
        'testimonial_submissions',
        'testimonials',
        'site_content',
        'newsletter_campaigns'
      )
  loop
    execute format(
      'drop policy %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end;
$$;

create policy care_requests_admin_access on public.care_requests
  for all to authenticated using (public.is_cedar_admin())
  with check (public.is_cedar_admin());

create policy newsletter_subscribers_admin_read on public.newsletter_subscribers
  for select to authenticated using (public.is_cedar_admin());

create policy testimonial_submissions_admin_access on public.testimonial_submissions
  for all to authenticated using (public.is_cedar_admin())
  with check (public.is_cedar_admin());

create policy testimonials_public_read on public.testimonials
  for select to anon, authenticated using (is_published = true or public.is_cedar_admin());
create policy testimonials_admin_write on public.testimonials
  for all to authenticated using (public.is_cedar_admin())
  with check (public.is_cedar_admin());

create policy site_content_public_read on public.site_content
  for select to anon using (true);
create policy site_content_admin_access on public.site_content
  for all to authenticated using (public.is_cedar_admin())
  with check (public.is_cedar_admin());

create policy newsletter_campaigns_admin_read on public.newsletter_campaigns
  for select to authenticated using (public.is_cedar_admin());

insert into public.site_content (id)
values (1)
on conflict (id) do nothing;

-- Images are public to view; only the allowlisted admin may upload or update them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-content',
  'site-content',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists cedar_admin_upload_site_content_images on storage.objects;
create policy cedar_admin_upload_site_content_images on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-content' and public.is_cedar_admin());

drop policy if exists cedar_admin_update_site_content_images on storage.objects;
create policy cedar_admin_update_site_content_images on storage.objects
  for update to authenticated
  using (bucket_id = 'site-content' and public.is_cedar_admin())
  with check (bucket_id = 'site-content' and public.is_cedar_admin());
