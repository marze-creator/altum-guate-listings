create index if not exists wa_conversation_reads_lead_id_idx
  on public.wa_conversation_reads (lead_id);
create index if not exists wa_conversation_reads_organization_id_idx
  on public.wa_conversation_reads (organization_id);

drop policy if exists wa_conversation_reads_select_own on public.wa_conversation_reads;
create policy wa_conversation_reads_select_own
on public.wa_conversation_reads
for select
to authenticated
using (
  user_id = (select auth.uid())
  and organization_id = (
    select p.organization_id from public.profiles p where p.user_id = (select auth.uid()) limit 1
  )
);

drop policy if exists wa_conversation_reads_insert_own on public.wa_conversation_reads;
create policy wa_conversation_reads_insert_own
on public.wa_conversation_reads
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and organization_id = (
    select p.organization_id from public.profiles p where p.user_id = (select auth.uid()) limit 1
  )
);

drop policy if exists wa_conversation_reads_update_own on public.wa_conversation_reads;
create policy wa_conversation_reads_update_own
on public.wa_conversation_reads
for update
to authenticated
using (
  user_id = (select auth.uid())
  and organization_id = (
    select p.organization_id from public.profiles p where p.user_id = (select auth.uid()) limit 1
  )
)
with check (
  user_id = (select auth.uid())
  and organization_id = (
    select p.organization_id from public.profiles p where p.user_id = (select auth.uid()) limit 1
  )
);
