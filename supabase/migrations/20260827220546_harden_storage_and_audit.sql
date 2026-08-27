create or replace function private.validate_file_asset_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  extension_value text := lower(substring(new.original_name from '\.([^.]+)$'));
  expected_extension text;
begin
  expected_extension := case new.mime_type
    when 'application/pdf' then 'pdf'
    when 'text/csv' then 'csv'
    when 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' then 'docx'
    when 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' then 'xlsx'
    when 'image/jpeg' then 'jpg|jpeg'
    when 'image/png' then 'png'
    when 'image/webp' then 'webp'
    when 'video/mp4' then 'mp4'
  end;

  if expected_extension is null
     or extension_value is null
     or extension_value !~ ('^(' || expected_extension || ')$') then
    raise exception 'file_extension_mime_mismatch' using errcode = '22023';
  end if;

  if new.size_bytes <= 0 or new.size_bytes > 26214400 then
    raise exception 'invalid_file_size' using errcode = '22023';
  end if;

  if tg_op = 'UPDATE' then
    if new.organization_id is distinct from old.organization_id
       or new.owner_user_id is distinct from old.owner_user_id
       or new.bucket_id is distinct from old.bucket_id
       or new.object_path is distinct from old.object_path
       or new.category is distinct from old.category then
      raise exception 'immutable_file_identity' using errcode = '22023';
    end if;

    if new.status is distinct from old.status and not (
      (old.status = 'pending' and new.status in ('uploaded', 'quarantined', 'deleted'))
      or (old.status = 'uploaded' and new.status in ('quarantined', 'superseded', 'deleted'))
      or (old.status = 'quarantined' and new.status in ('uploaded', 'deleted'))
      or (old.status = 'superseded' and new.status = 'deleted')
    ) then
      raise exception 'invalid_file_status_transition' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_file_asset_metadata()
  from public, anon, authenticated, service_role;

drop trigger if exists file_assets_validate_metadata on public.file_assets;
create trigger file_assets_validate_metadata
before insert or update on public.file_assets
for each row execute function private.validate_file_asset_metadata();

comment on function private.validate_file_asset_metadata() is
  'Defense-in-depth validation for file extension, declared MIME type, size, immutable identity and status transitions.';

-- Audit records are append-only for application roles. Keep the intent explicit
-- even if a previous migration already granted authenticated users SELECT only.
revoke insert, update, delete, truncate on public.audit_events from anon, authenticated;
