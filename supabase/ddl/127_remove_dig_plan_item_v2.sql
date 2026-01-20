-- 127_remove_dig_plan_item_v2.sql
-- Soft delete dig plan item with friendly error messages

create or replace function public.remove_dig_plan_item_v2(
  p_item_id uuid,
  p_notes text default null
)
returns table(ok boolean, error_code text, message text)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- validate exists
  if not exists (select 1 from public.dig_plan_items where id = p_item_id) then
    return query select false, 'ITEM_NOT_FOUND', 'ไม่พบรายการนี้ในแผน';
    return;
  end if;

  -- soft delete (recommended)
  update public.dig_plan_items
  set
    is_active = false,
    notes = case
      when p_notes is null or p_notes = '' then notes
      when notes is null or notes = '' then p_notes
      else notes || ' | ' || p_notes
    end,
    updated_at = now()
  where id = p_item_id;

  return query select true, null::text, 'ลบรายการออกจากแผนแล้ว';
  return;
end;
$$;

revoke all on function public.remove_dig_plan_item_v2(uuid, text) from public;
grant execute on function public.remove_dig_plan_item_v2(uuid, text) to authenticated;
