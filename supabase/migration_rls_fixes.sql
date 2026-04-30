-- Migration: fix missing RLS policies
-- Run this in Supabase SQL Editor

-- 1. Allow public (anonymous) SELECT on clientes
--    Without this, the scan page can't look up clients by phone → duplicates on every scan
create policy "Public reads clientes" on clientes
  for select using (true);

-- 2. Allow owner to delete clients, visits and coupons
create policy "Owner deletes clients" on clientes
  for delete using (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );

create policy "Owner deletes visitas" on visitas
  for delete using (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );

create policy "Owner deletes cupones" on cupones
  for delete using (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );
