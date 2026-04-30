-- TapPoints Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── NEGOCIOS ────────────────────────────────────────────────────────────────
create table if not exists negocios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  nombre text not null,
  slug text unique not null,
  puntos_por_visita integer not null default 1,
  puntos_para_recompensa integer not null default 10,
  recompensa text not null default 'Premio especial',
  created_at timestamptz not null default now()
);

alter table negocios enable row level security;

-- Owner can write (insert/update/delete) their own business
create policy "Owner manages negocio" on negocios
  for all using (auth.uid() = user_id);

-- Public (unauthenticated) can read any negocio (needed for scan page)
create policy "Public reads negocios" on negocios
  for select using (true);

-- ─── CLIENTES ────────────────────────────────────────────────────────────────
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios not null,
  nombre text not null,
  telefono text not null,
  puntos integer not null default 0,
  visitas integer not null default 0,
  nivel text not null default 'nuevo' check (nivel in ('nuevo', 'bronce', 'plata', 'oro')),
  ultima_visita timestamptz,
  created_at timestamptz not null default now()
);

alter table clientes enable row level security;

-- Business owner can read all clients of their business
create policy "Owner reads clients" on clientes
  for select using (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );

-- Public (unauthenticated) can read, insert and update clients (for QR scan page)
-- Read is required so the scan page can look up an existing client by phone
create policy "Public reads clientes" on clientes
  for select using (true);

create policy "Public can insert clients" on clientes
  for insert with check (true);

create policy "Public can update clients" on clientes
  for update using (true);

-- Owner can delete their clients
create policy "Owner deletes clients" on clientes
  for delete using (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );

-- ─── VISITAS ─────────────────────────────────────────────────────────────────
create table if not exists visitas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios not null,
  cliente_id uuid references clientes not null,
  puntos_ganados integer not null default 1,
  created_at timestamptz not null default now()
);

alter table visitas enable row level security;

create policy "Owner reads visitas" on visitas
  for select using (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );

create policy "Public can insert visitas" on visitas
  for insert with check (true);

create policy "Owner deletes visitas" on visitas
  for delete using (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );

-- ─── CUPONES ─────────────────────────────────────────────────────────────────
create table if not exists cupones (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios not null,
  cliente_id uuid references clientes not null,
  codigo text unique not null,
  recompensa text not null,
  canjeado boolean not null default false,
  canjeado_at timestamptz,
  created_at timestamptz not null default now()
);

alter table cupones enable row level security;

create policy "Owner reads cupones" on cupones
  for select using (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );

create policy "Owner updates cupones" on cupones
  for update using (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );

create policy "Public can insert cupones" on cupones
  for insert with check (true);

create policy "Public can read cupones by cliente" on cupones
  for select using (true);

create policy "Owner deletes cupones" on cupones
  for delete using (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );

-- ─── QR_TOKENS ───────────────────────────────────────────────────────────────
create table if not exists qr_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  negocio_id uuid references negocios not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

alter table qr_tokens enable row level security;

-- Only authenticated owner can create tokens for their business
create policy "Owner creates qr_tokens" on qr_tokens
  for insert with check (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );

-- Public can read tokens (to verify on scan page)
create policy "Public reads qr_tokens" on qr_tokens
  for select using (true);

-- Public can mark token as used (atomic lock on scan)
create policy "Public updates qr_tokens" on qr_tokens
  for update using (true);
