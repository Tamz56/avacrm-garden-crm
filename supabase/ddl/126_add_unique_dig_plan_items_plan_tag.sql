-- 126_add_unique_dig_plan_items_plan_tag.sql
-- Prevent duplicate (plan_id, tag_id) in dig_plan_items
-- Safe to re-run

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dig_plan_items_plan_tag_unique'
  ) then
    alter table public.dig_plan_items
      add constraint dig_plan_items_plan_tag_unique
      unique (plan_id, tag_id);
  end if;
end $$;

-- Update RPC to return friendly error messages
create or replace function public.add_dig_plan_item_v1(
  p_plan_id uuid,
  p_tag_id uuid,
  p_size_label text default null,
  p_grade text default null,
  p_qty integer default 1,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Validate qty
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantity ต้องมากกว่า 0';
  end if;

  insert into public.dig_plan_items (
    plan_id, tag_id, size_label, grade, qty, is_active, notes, created_by
  )
  values (
    p_plan_id, p_tag_id, p_size_label, p_grade, p_qty, true, p_notes, auth.uid()
  )
  returning id into v_id;

  return v_id;

exception
  when unique_violation then
    -- 23505: duplicate tag in same plan
    raise exception 'Tag นี้ถูกเพิ่มในแผนนี้แล้ว';
  when foreign_key_violation then
    -- 23503: tag_id not found in tree_tags
    raise exception 'ไม่พบ Tag นี้ในระบบ (tree_tags)';
end;
$$;

-- Permissions
revoke all on function public.add_dig_plan_item_v1(uuid, uuid, text, text, integer, text) from public;
grant execute on function public.add_dig_plan_item_v1(uuid, uuid, text, text, integer, text) to authenticated;
