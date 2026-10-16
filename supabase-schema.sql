-- ==============================================================================
-- InspectA4 Property Inspection App - Supabase Database Schema
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create the inspections table
create table if not exists public.inspections (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  property_address text not null default 'Untitled Property',
  report_json jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add performance indexes for rapid querying
create index if not exists idx_inspections_user_id on public.inspections(user_id);
create index if not exists idx_inspections_updated_at on public.inspections(updated_at desc);

-- 3. Enable Row Level Security (RLS)
alter table public.inspections enable row level security;

-- 4. Set RLS Policies:
-- Option A: Team / Multi-Inspector Shared Workspace:
-- All authenticated users in your team can view, edit, and create reports
create policy "Authenticated users can select all inspections"
  on public.inspections for select
  to authenticated
  using (true);

create policy "Authenticated users can insert inspections"
  on public.inspections for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

create policy "Authenticated users can update inspections"
  on public.inspections for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete inspections"
  on public.inspections for delete
  to authenticated
  using (true);

-- Optional: Allow anonymous read-only access if you share a link to an inspection without logging in
create policy "Allow public read access"
  on public.inspections for select
  to anon
  using (true);
