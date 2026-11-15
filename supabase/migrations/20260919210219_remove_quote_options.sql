-- Retire les niveaux de prestation, tarifs invités et lieux : le configurateur ne les propose plus.
delete from public.content where kind in ('levels', 'guests', 'venues');
alter table public.content drop constraint if exists content_kind_check;
alter table public.content add constraint content_kind_check
  check (kind in ('services','products','events','projects','pages','socials'));
