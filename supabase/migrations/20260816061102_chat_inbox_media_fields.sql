alter table public.wa_messages
  add column if not exists message_type text not null default 'text',
  add column if not exists media_url text,
  add column if not exists meta_message_id text;

create index if not exists wa_messages_meta_message_id_idx
  on public.wa_messages (meta_message_id)
  where meta_message_id is not null;
