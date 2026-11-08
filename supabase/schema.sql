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

alter table public.care_requests
  add column if not exists status text not null default 'new';
alter table public.testimonial_submissions
  add column if not exists rating smallint not null default 5,
  add column if not exists location text;
alter table public.testimonials
  add column if not exists rating smallint not null default 5,
  add column if not exists location text;

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

alter table public.site_content enable row level security;
alter table public.newsletter_campaigns enable row level security;

create or replace function public.is_cedar_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() = 'bb9a9a8e-83b6-4c7a-b101-dcfdfe9fd20c'::uuid;
$$;

grant execute on function public.is_cedar_admin() to anon, authenticated;

revoke all on public.care_requests from anon, authenticated;
revoke all on public.newsletter_subscribers from anon, authenticated;
revoke all on public.testimonial_submissions from anon, authenticated;
revoke all on public.testimonials from anon, authenticated;
revoke all on public.site_content from anon, authenticated;
revoke all on public.newsletter_campaigns from anon, authenticated;

grant select, update, delete on public.care_requests to authenticated;
grant select on public.newsletter_subscribers to authenticated;
grant select, update, delete on public.testimonial_submissions to authenticated;
grant select, insert, update, delete on public.testimonials to authenticated;
grant select on public.testimonials to anon;
grant select (id, published, updated_at) on public.site_content to anon;
grant select, insert, update on public.site_content to authenticated;
grant select on public.newsletter_campaigns to authenticated;

drop policy if exists care_requests_admin_access on public.care_requests;
create policy care_requests_admin_access on public.care_requests
  for all to authenticated using (public.is_cedar_admin())
  with check (public.is_cedar_admin());

drop policy if exists newsletter_subscribers_admin_read on public.newsletter_subscribers;
create policy newsletter_subscribers_admin_read on public.newsletter_subscribers
  for select to authenticated using (public.is_cedar_admin());

drop policy if exists testimonial_submissions_admin_access on public.testimonial_submissions;
create policy testimonial_submissions_admin_access on public.testimonial_submissions
  for all to authenticated using (public.is_cedar_admin())
  with check (public.is_cedar_admin());

drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read on public.testimonials
  for select to anon, authenticated using (is_published = true or public.is_cedar_admin());
drop policy if exists testimonials_admin_write on public.testimonials;
create policy testimonials_admin_write on public.testimonials
  for all to authenticated using (public.is_cedar_admin())
  with check (public.is_cedar_admin());

drop policy if exists site_content_public_read on public.site_content;
create policy site_content_public_read on public.site_content
  for select to anon using (true);
drop policy if exists site_content_admin_access on public.site_content;
create policy site_content_admin_access on public.site_content
  for all to authenticated using (public.is_cedar_admin())
  with check (public.is_cedar_admin());

drop policy if exists newsletter_campaigns_admin_read on public.newsletter_campaigns;
create policy newsletter_campaigns_admin_read on public.newsletter_campaigns
  for select to authenticated using (public.is_cedar_admin());

grant all on public.site_content to service_role;
grant all on public.newsletter_campaigns to service_role;

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
