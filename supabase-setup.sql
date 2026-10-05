-- Run this once in Supabase → SQL Editor

-- 1. Enable Row Level Security on orders
alter table public.orders enable row level security;

-- 2. Allow only logged-in (authenticated) users to READ orders
create policy "Authenticated users can read orders"
on public.orders
for select
to authenticated
using (true);

-- 3. Enable Realtime broadcasts for orders table
alter publication supabase_realtime add table public.orders;

-- 4. Create your admin/owner login(s):
--    Go to Authentication → Users → Add User (email + password) for each admin.
--    No SQL needed for this step.

-- 5. Store settings (live theme / overlay picked in the dashboard → shown on the main website)
create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.store_settings enable row level security;

drop policy if exists "Anyone can read store settings" on public.store_settings;
create policy "Anyone can read store settings"
on public.store_settings for select to anon, authenticated using (true);

drop policy if exists "Admins can write store settings" on public.store_settings;
create policy "Admins can write store settings"
on public.store_settings for all to authenticated using (true) with check (true);

-- Tip: Authentication → Providers → Email → turn OFF "Allow new users to sign up",
-- so only the admin accounts you create manually can log in.
