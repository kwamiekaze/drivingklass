-- Home page music: an on/off switch and a playlist the admins manage. Everyone can read, only admins can change.
create table if not exists public.home_music_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.home_music_settings (id, enabled) values (1, false) on conflict (id) do nothing;

create table if not exists public.home_music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.home_music_settings enable row level security;
alter table public.home_music_tracks enable row level security;

create policy "anyone can read home music settings" on public.home_music_settings for select using (true);
create policy "admins manage home music settings" on public.home_music_settings for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "anyone can read home music tracks" on public.home_music_tracks for select using (true);
create policy "admins manage home music tracks" on public.home_music_tracks for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

insert into storage.buckets (id, name, public) values ('home-music', 'home-music', true) on conflict (id) do nothing;
create policy "anyone can play home music" on storage.objects for select using (bucket_id = 'home-music');
create policy "admins add home music" on storage.objects for insert with check (bucket_id = 'home-music' and public.has_role(auth.uid(), 'admin'));
create policy "admins change home music" on storage.objects for update using (bucket_id = 'home-music' and public.has_role(auth.uid(), 'admin'));
create policy "admins remove home music" on storage.objects for delete using (bucket_id = 'home-music' and public.has_role(auth.uid(), 'admin'));
