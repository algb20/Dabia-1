-- شغّل هذا مرة واحدة في Supabase SQL Editor لإنشاء جدول روابط التواصل
-- الرسمية للتطبيق. بعد إنشائه، التحكم اليومي (تفعيل/تعطيل/تغيير رابط)
-- يكون مباشرة من: Supabase Dashboard → Table Editor → app_official_links
-- بدون أي حاجة لإعادة نشر التطبيق أو طلب تعديل كود.

create table if not exists app_official_links (
  platform   text primary key,
  url        text not null default '',
  enabled    boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into app_official_links (platform, url, enabled) values
  ('facebook',  '', false),
  ('instagram', '', false),
  ('x',         '', false),
  ('telegram',  '', false),
  ('youtube',   '', false),
  ('tiktok',    '', false)
on conflict (platform) do nothing;

alter table app_official_links enable row level security;

-- قراءة عامة (الجميع — مستخدمون وزوار — يحتاجون رؤية الروابط المفعّلة)
drop policy if exists "public read official links" on app_official_links;
create policy "public read official links" on app_official_links
  for select using (true);

-- لا توجد سياسة كتابة عامة عمداً: التعديل يكون فقط من حسابك في
-- Supabase Dashboard (يتجاوز RLS تلقائياً بصفتك مالك المشروع)، وهذا
-- بالضبط ما طلبته — تحكم سريع وآمن من جهتك فقط.

-- لتفعيل رابط: عدّل الصف في Table Editor وضع الرابط في url وغيّر enabled إلى true.
-- مثال تحديث مباشر بدلاً من واجهة Table Editor:
-- update app_official_links set url = 'https://facebook.com/yourpage', enabled = true where platform = 'facebook';
