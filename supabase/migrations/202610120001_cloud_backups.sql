-- Google login remains owned by FitCore. Only its authenticated server accesses
-- this table; browser/public Supabase keys have no access to health backups.
begin;
create table if not exists public.fitcore_cloud_backups (
  owner_id text primary key check (owner_id ~ '^google:[0-9]+$'),
  payload jsonb not null check (payload->>'format' = 'fitcore-backup' and payload->>'version' = '1'),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  bytes integer not null check (bytes between 1 and 3145728)
);
alter table public.fitcore_cloud_backups enable row level security;
revoke all on public.fitcore_cloud_backups from public, anon, authenticated;
grant select, insert, update on public.fitcore_cloud_backups to service_role;

create or replace function public.fitcore_save_backup(p_owner text, p_payload jsonb, p_expected bigint, p_bytes integer)
returns table(version bigint, updated_at timestamptz, bytes integer)
language plpgsql security invoker set search_path = '' as $$
begin
  if p_expected = 0 then
    insert into public.fitcore_cloud_backups(owner_id, payload, bytes)
    values(p_owner, p_payload, p_bytes) on conflict (owner_id) do nothing;
  else
    update public.fitcore_cloud_backups b
    set payload=p_payload, version=b.version+1, updated_at=now(), bytes=p_bytes
    where b.owner_id=p_owner and b.version=p_expected;
  end if;
  if not found then raise exception 'BACKUP_CONFLICT' using errcode='P0001'; end if;
  return query select b.version,b.updated_at,b.bytes from public.fitcore_cloud_backups b where b.owner_id=p_owner;
end;
$$;
revoke all on function public.fitcore_save_backup(text,jsonb,bigint,integer) from public, anon, authenticated;
grant execute on function public.fitcore_save_backup(text,jsonb,bigint,integer) to service_role;
commit;
