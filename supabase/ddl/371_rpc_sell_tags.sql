create or replace function public.sell_tags_v1(
  p_tag_ids uuid[],
  p_notes text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int := 0;
  v_tag record;
begin
  -- validate: must be reserved
  for v_tag in
    select id, status
    from public.tree_tags
    where id = any(p_tag_ids)
  loop
    if v_tag.status <> 'reserved' then
      raise exception 'Tag % status is %, expected reserved', v_tag.id, v_tag.status;
    end if;
  end loop;

  update public.tree_tags
  set status = 'sold'
  where id = any(p_tag_ids);

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;
