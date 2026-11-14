-- Eventheme content and private client requests. Run on a new Supabase project.
create table public.content (
  id text primary key,
  kind text not null check (kind in ('services','products','events','levels','guests','venues','projects','pages','socials')),
  published boolean not null default false,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now()
);
create index content_kind_published on public.content (kind, published);
create table public.inquiries (
  id uuid primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now()
);
create table public.rate_limits (
  key text primary key,
  attempts integer not null default 1,
  expires_at timestamptz not null
);
alter table public.content enable row level security;
alter table public.inquiries enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.content, public.inquiries, public.rate_limits from anon, authenticated;
grant select on public.content to anon, authenticated;
grant insert, update, delete on public.content to authenticated;
grant select, update, delete on public.inquiries to authenticated;
grant all on public.content, public.inquiries, public.rate_limits to service_role;
create policy "Published content is public" on public.content for select to anon, authenticated using (published = true);
create policy "Admins read all content" on public.content for select to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins add content" on public.content for insert to authenticated with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins edit content" on public.content for update to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin') with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins delete content" on public.content for delete to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins read requests" on public.inquiries for select to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins update requests" on public.inquiries for update to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin') with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins delete requests" on public.inquiries for delete to authenticated using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
-- No public INSERT policy: validated submissions must pass through the server.
create function public.consume_rate_limit(bucket_key text, max_attempts integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_attempts integer;
begin
  delete from public.rate_limits where expires_at < now();
  insert into public.rate_limits (key, attempts, expires_at)
    values (bucket_key, 1, now() + interval '15 minutes')
    on conflict (key) do update set attempts = public.rate_limits.attempts + 1
    returning attempts into current_attempts;
  return current_attempts <= max_attempts;
end;
$$;
revoke execute on function public.consume_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer) to service_role;
-- Public media, writable only by administrators; no SVG or executable uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('eventheme-media', 'eventheme-media', true, 8388608, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "Admins insert Eventheme media" on storage.objects for insert to authenticated with check (bucket_id = 'eventheme-media' and (select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins read Eventheme media" on storage.objects for select to authenticated using (bucket_id = 'eventheme-media' and (select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins update Eventheme media" on storage.objects for update to authenticated using (bucket_id = 'eventheme-media' and (select auth.jwt()->'app_metadata'->>'role') = 'admin') with check (bucket_id = 'eventheme-media' and (select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "Admins delete Eventheme media" on storage.objects for delete to authenticated using (bucket_id = 'eventheme-media' and (select auth.jwt()->'app_metadata'->>'role') = 'admin');
