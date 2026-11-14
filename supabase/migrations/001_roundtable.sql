begin;
create table public.plans (
 id text primary key check (length(id) = 32),
 title text not null check (length(title) between 1 and 100),
 organizer_hash text not null,
 confirmed_option_id uuid,
 created_at timestamptz not null default now()
);
create table public.options (
 id uuid primary key default gen_random_uuid(),
 plan_id text not null references public.plans(id) on delete cascade,
 place text not null check (length(place) between 1 and 120),
 starts_at timestamptz not null,
 maps_url text check (length(maps_url) <= 2048),
 unique(plan_id,id)
);
alter table public.plans add constraint confirmed_belongs_to_plan foreign key (id,confirmed_option_id) references public.options(plan_id,id);
create table public.votes (
 plan_id text not null references public.plans(id) on delete cascade,
 participant_id uuid not null,
 nickname text not null check(length(nickname) between 1 and 40),
 option_id uuid not null,
 primary key(plan_id,participant_id),
 foreign key(plan_id,option_id) references public.options(plan_id,id) on delete cascade
);
alter table public.plans enable row level security;
alter table public.options enable row level security;
alter table public.votes enable row level security;
revoke all on public.plans,public.options,public.votes from anon,authenticated;
-- No public policies: only the server's trusted Postgres connection accesses data.
commit;
