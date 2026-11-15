-- EVENTHEMES, phase 2: catalogue categories, request references and statuses,
-- private attachments. Apply after 20260919210219_remove_quote_options.sql and
-- before deploying the code that uses them.

-- 1. Catalogue categories and sub-categories are content entries of their own kind.
alter table public.content drop constraint if exists content_kind_check;
alter table public.content add constraint content_kind_check
  check (kind in ('services','products','categories','events','projects','pages','socials'));

-- 2. Readable, unique request references: EVT-<year>-<number>. One counter for
--    all years, so a number is never reused.
create sequence if not exists public.inquiry_reference_seq;
revoke all on sequence public.inquiry_reference_seq from public, anon, authenticated;
grant usage, select on sequence public.inquiry_reference_seq to service_role;

create or replace function public.next_inquiry_reference()
returns text language sql security invoker set search_path = '' as $$
  select 'EVT-' || to_char(now() at time zone 'Africa/Casablanca', 'YYYY') || '-'
    || lpad(nextval('public.inquiry_reference_seq')::text, 4, '0');
$$;
revoke execute on function public.next_inquiry_reference() from public, anon, authenticated;
grant execute on function public.next_inquiry_reference() to service_role;

-- Requests received before this migration get a reference, in arrival order.
do $$
declare request record;
begin
  for request in
    select id from public.inquiries where data->>'reference' is null order by created_at
  loop
    update public.inquiries
      set data = data || jsonb_build_object('reference', public.next_inquiry_reference())
      where id = request.id;
  end loop;
end $$;
create unique index if not exists inquiries_reference_key on public.inquiries ((data->>'reference'));

-- 3. Request statuses of the specification (§07). The application also maps
--    the former values when it reads them.
update public.inquiries
  set data = jsonb_set(data, '{status}', to_jsonb(case data->>'status'
    when 'Nouvelle demande' then 'Nouveau'
    when 'Confirmé' then 'Accepté'
    when 'Annulé' then 'Refusé'
  end))
  where data->>'status' in ('Nouvelle demande', 'Confirmé', 'Annulé');

-- 4. Client attachments (plans, photos, documents): a private bucket with no
--    policy at all, so only the server (service role) can read or write it.
--    The team downloads through one-minute signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eventheme-requests', 'eventheme-requests', false, 4194304,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
