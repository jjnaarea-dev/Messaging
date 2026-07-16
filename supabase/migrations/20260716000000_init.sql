-- Blast Messenger schema: contacts, groups, and a log of every send.

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  primary key (group_id, contact_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.message_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  name text not null,
  phone text not null,
  status text not null default 'pending', -- pending | sent | failed
  error text,
  provider_sid text,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_recipients enable row level security;

create policy "own contacts" on public.contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own groups" on public.groups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own group members" on public.group_members
  for all using (
    exists (select 1 from public.groups g where g.id = group_id and g.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.groups g where g.id = group_id and g.user_id = auth.uid())
  );

create policy "own messages" on public.messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own message recipients" on public.message_recipients
  for all using (
    exists (select 1 from public.messages m where m.id = message_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.messages m where m.id = message_id and m.user_id = auth.uid())
  );
