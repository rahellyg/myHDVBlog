-- ============================================
-- מעקב כניסות לאתר — הריצי פעם אחת ב-Supabase
-- Supabase Dashboard ← SQL Editor ← New query ← הדביקי הכול ← Run
-- ============================================

create table if not exists page_views (
  id bigint generated always as identity primary key,
  path text not null default '/',
  created_at timestamptz not null default now()
);

alter table page_views enable row level security;

-- כל גולש רושם כניסה; רק בעלת הבלוג (מחוברת) רואה את הספירה
drop policy if exists "anyone add page view" on page_views;
drop policy if exists "owner read page views" on page_views;
create policy "anyone add page view" on page_views for insert with check (true);
create policy "owner read page views" on page_views for select using (auth.role() = 'authenticated');
