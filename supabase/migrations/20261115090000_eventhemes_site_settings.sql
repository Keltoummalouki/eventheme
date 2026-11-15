-- EVENTHEMES: site settings (cahier des charges §07 « Paramètres » : informations
-- générales, langues, mise en ligne) are one content entry of their own kind,
-- id 'settings'. Everything in it is shown on the public site (address, opening
-- hours, published languages), so visitors may read it like any published
-- content; private values stay in server environment variables.
-- Apply after 20261114200000_eventhemes_city_pages.sql and before deploying the
-- code that uses it.

alter table public.content drop constraint if exists content_kind_check;
alter table public.content add constraint content_kind_check
  check (kind in ('services','products','categories','events','projects','pages','cities','socials','settings'));
