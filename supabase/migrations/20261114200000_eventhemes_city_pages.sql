-- EVENTHEMES, phase 5: city pages (« Zones d’intervention », cahier des charges §10)
-- are content entries of their own kind. Apply after
-- 20261114180000_eventhemes_catalogue_requests.sql and before deploying the
-- code that uses them. Visitors keep reading published content only (RLS unchanged).

alter table public.content drop constraint if exists content_kind_check;
alter table public.content add constraint content_kind_check
  check (kind in ('services','products','categories','events','projects','pages','cities','socials'));
