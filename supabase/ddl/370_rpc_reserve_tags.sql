create or replace function public.reserve_tags_v1(
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
  -- validate: must be ready_for_sale
  for v_tag in
    select id, status
    from public.tree_tags
    where id = any(p_tag_ids)
  loop
    if v_tag.status <> 'ready_for_sale' then
      raise exception 'Tag % status is %, expected ready_for_sale', v_tag.id, v_tag.status;
    end if;
  end loop;

  update public.tree_tags
  set status = 'reserved'
  where id = any(p_tag_ids);

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;
