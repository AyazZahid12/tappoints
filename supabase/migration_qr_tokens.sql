-- Migration: add qr_tokens table + fix negocios public read
-- Run this in Supabase SQL Editor if the project already exists

-- Fix: allow anonymous users to read negocios (needed for scan page)
create policy "Public reads negocios" on negocios
  for select using (true);

-- Add qr_tokens table

create table if not exists qr_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  negocio_id uuid references negocios not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

alter table qr_tokens enable row level security;

create policy "Owner creates qr_tokens" on qr_tokens
  for insert with check (
    negocio_id in (select id from negocios where user_id = auth.uid())
  );

create policy "Public reads qr_tokens" on qr_tokens
  for select using (true);

create policy "Public updates qr_tokens" on qr_tokens
  for update using (true);
