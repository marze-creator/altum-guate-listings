create table if not exists public.wa_conversation_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lead_id)
);

alter table public.wa_conversation_reads enable row level security;

drop policy if exists wa_conversation_reads_select_own on public.wa_conversation_reads;
create policy wa_conversation_reads_select_own
on public.wa_conversation_reads
for select
to authenticated
using (
  user_id = auth.uid()
  and organization_id = (
    select p.organization_id from public.profiles p where p.user_id = auth.uid() limit 1
  )
);

drop policy if exists wa_conversation_reads_insert_own on public.wa_conversation_reads;
create policy wa_conversation_reads_insert_own
on public.wa_conversation_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and organization_id = (
    select p.organization_id from public.profiles p where p.user_id = auth.uid() limit 1
  )
);

drop policy if exists wa_conversation_reads_update_own on public.wa_conversation_reads;
create policy wa_conversation_reads_update_own
on public.wa_conversation_reads
for update
to authenticated
using (
  user_id = auth.uid()
  and organization_id = (
    select p.organization_id from public.profiles p where p.user_id = auth.uid() limit 1
  )
)
with check (
  user_id = auth.uid()
  and organization_id = (
    select p.organization_id from public.profiles p where p.user_id = auth.uid() limit 1
  )
);

create index if not exists wa_messages_lead_created_at_idx
  on public.wa_messages (lead_id, created_at desc);
create index if not exists wa_messages_org_created_at_idx
  on public.wa_messages (organization_id, created_at desc);
create index if not exists leads_org_updated_at_idx
  on public.leads (organization_id, updated_at desc);

update public.wa_messages
set sender = case
  when role = 'user' then 'cliente'
  when role = 'assistant' then 'andrea'
  else sender
end
where sender is null;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wa_messages'
  ) then
    alter publication supabase_realtime add table public.wa_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;
