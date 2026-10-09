-- Home page weather: what the admins chose for the whole site. weather = 'live' (the real weather of Carrollton, GA) or one fixed pattern; night = 'live' (the clock) or fixed.
-- Everyone can read it, only admins can change it.
create table if not exists public.home_weather_settings (
  id integer primary key default 1 check (id = 1),
  weather text not null default 'live' check (weather in ('live','clear','cloudy','fog','rain','storm','snow')),
  night text not null default 'live' check (night in ('live','deep','normal')),
  updated_at timestamptz not null default now()
);
insert into public.home_weather_settings (id) values (1) on conflict (id) do nothing;

alter table public.home_weather_settings enable row level security;
create policy "anyone can read home weather settings" on public.home_weather_settings for select using (true);
create policy "admins manage home weather settings" on public.home_weather_settings for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
