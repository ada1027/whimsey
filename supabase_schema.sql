-- =====================================================================
-- WHIMSEY · Supabase schema (prototype)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
--
-- ⚠️ PROTOTYPE ONLY: Row Level Security is enabled but the policies are
-- wide open, so anyone with your anon key (which ships in the web app)
-- can read and change every row and upload proof files. Don't store real
-- personal data, and tighten these policies before a public launch.
-- =====================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  username    text not null unique,
  avatar      text,                         -- JSON: { look: {...}, equipped: {...} }
  level       int  not null default 1,
  xp          int  not null default 0,
  coins       int  not null default 0,
  streak      int  not null default 0,
  status      text not null default 'online'
              check (status in ('online', 'in_lobby', 'in_quest')),
  is_bot      boolean not null default false, -- sample users + simulated teammates
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- usernames are unique regardless of case ("Ada" = "ada")
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create table if not exists public.friendships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade, -- who sent the request
  friend_id   uuid not null references public.profiles (id) on delete cascade, -- who receives it
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);
create index if not exists friendships_friend_idx on public.friendships (friend_id);

create table if not exists public.parties (
  id            uuid primary key default gen_random_uuid(),
  leader_id     uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'lobby'
                check (status in ('lobby', 'voting', 'active_quest', 'completed')),
  current_quest jsonb,                        -- the group quest being voted on / played
  rerolls_used  int   not null default 0,
  votes         jsonb not null default '{}'::jsonb, -- { "<user id>": "accept" | "reroll" }
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists parties_leader_idx on public.parties (leader_id);

create table if not exists public.party_members (
  id              uuid primary key default gen_random_uuid(),
  party_id        uuid not null references public.parties (id) on delete cascade,
  user_id         uuid not null unique references public.profiles (id) on delete cascade, -- one party per player
  is_ready        boolean not null default false,
  has_completed   boolean not null default false,
  completion_mode text check (completion_mode in ('together', 'separate')),
  proof_url       text,
  joined_at       timestamptz not null default now()
);
create index if not exists party_members_party_idx on public.party_members (party_id);

-- ---------------------------------------------------------------------
-- Keep updated_at fresh (also used as a "last seen" heartbeat)
-- ---------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists parties_touch_updated_at on public.parties;
create trigger parties_touch_updated_at before update on public.parties
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Atomic vote: merges one player's vote into parties.votes so two
-- teammates voting at the same moment can't overwrite each other.
-- ---------------------------------------------------------------------

create or replace function public.cast_vote(p_party_id uuid, p_user_id uuid, p_vote text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.parties
     set votes = coalesce(votes, '{}'::jsonb) || jsonb_build_object(p_user_id::text, p_vote)
   where id = p_party_id
     and p_vote in ('accept', 'reroll');
$$;

grant execute on function public.cast_vote(uuid, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security: enabled, with open prototype policies
-- ---------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.friendships   enable row level security;
alter table public.parties       enable row level security;
alter table public.party_members enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'friendships', 'parties', 'party_members'] loop
    execute format('drop policy if exists "prototype open access" on public.%I', t);
    execute format(
      'create policy "prototype open access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.friendships, public.parties, public.party_members
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- Realtime: broadcast every insert / update / delete on these tables
-- ---------------------------------------------------------------------

alter table public.profiles      replica identity full;
alter table public.friendships   replica identity full;
alter table public.parties       replica identity full;
alter table public.party_members replica identity full;

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['profiles', 'friendships', 'parties', 'party_members'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Storage: public "quest-proofs" bucket for proof photos / videos
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('quest-proofs', 'quest-proofs', true, 52428800) -- 50 MB per file
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "quest-proofs public read" on storage.objects;
create policy "quest-proofs public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'quest-proofs');

drop policy if exists "quest-proofs public upload" on storage.objects;
create policy "quest-proofs public upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'quest-proofs');

drop policy if exists "quest-proofs public update" on storage.objects;
create policy "quest-proofs public update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'quest-proofs') with check (bucket_id = 'quest-proofs');

-- Done! Your tables appear under Table Editor, and the app syncs live.
