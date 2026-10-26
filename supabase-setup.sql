-- ============================================
-- חיים בקצב שלי — הקמת טבלאות ב-Supabase
-- איך משתמשים: Supabase Dashboard ← SQL Editor ← New query ← הדביקי הכול ← Run
-- ============================================

-- פוסטים (בלוג/וולוג/תמונות/טיפים)
create table if not exists posts (
  id text primary key,
  type text not null default 'blog',
  title text not null,
  content text not null default '',
  media text default '',
  likes int not null default 0,
  created_at timestamptz not null default now()
);

-- תגובות לפוסטים
create table if not exists comments (
  id bigint generated always as identity primary key,
  post_id text not null references posts(id) on delete cascade,
  name text not null default 'אורחת',
  text text not null,
  created_at timestamptz not null default now()
);

-- כתבות "חיים בריאים"
create table if not exists articles (
  id text primary key,
  icon text default '🌱',
  title text not null,
  content text not null default '',
  media text default '',
  created_at timestamptz not null default now()
);

-- המלצות ("שיתוף מהלב")
create table if not exists recs (
  id text primary key,
  icon text default '💛',
  title text not null,
  text text not null default '',
  url text not null,
  created_at timestamptz not null default now()
);

-- שאלה/תשובה
create table if not exists questions (
  id text primary key,
  name text not null,
  email text not null,
  text text not null,
  answer text default '',
  created_at timestamptz not null default now()
);

-- הרשאות: כולם יכולים לקרוא ולהגיב/לשאול; רק בעלת הבלוג (מחוברת) כותבת תוכן
alter table posts enable row level security;
alter table comments enable row level security;
alter table articles enable row level security;
alter table recs enable row level security;
alter table questions enable row level security;

-- קריאה פתוחה לכולם
create policy "public read posts" on posts for select using (true);
create policy "public read comments" on comments for select using (true);
create policy "public read articles" on articles for select using (true);
create policy "public read recs" on recs for select using (true);
create policy "public read questions" on questions for select using (true);

-- כתיבת תוכן (פוסטים/כתבות/המלצות/תשובות) — רק למשתמשת מחוברת
create policy "owner write posts" on posts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "owner write articles" on articles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "owner write recs" on recs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- גולשים: רק להוסיף תגובה/שאלה/לייק
create policy "anyone add comment" on comments for insert with check (true);
create policy "anyone ask question" on questions for insert with check (true);
create policy "anyone like post" on posts for update using (true) with check (true);
create policy "owner answer question" on questions for update using (auth.role() = 'authenticated');
create policy "owner delete question" on questions for delete using (auth.role() = 'authenticated');
