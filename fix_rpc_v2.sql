create or replace function public.get_tag_lifecycle_totals_v2(
  p_zone_id uuid default null,
  p_species_id uuid default null
)
returns table (
  zone_id uuid,
  total_tags int,

  available_qty int,
  reserved_qty int,
  dig_ordered_qty int,
  dug_qty int,
  shipped_qty int,
  planted_qty int,

  selected_for_dig_qty int,
  root_prune_qty int,
  ready_to_lift_qty int,
  rehab_qty int,
  dead_qty int
)
language sql
stable
as $$
  select
    p_zone_id as zone_id,
    count(*)::int as total_tags,

    count(*) filter (where t.status = 'available')::int as available_qty,
    count(*) filter (where t.status = 'reserved')::int as reserved_qty,
    count(*) filter (where t.status = 'dig_ordered')::int as dig_ordered_qty,
    count(*) filter (where t.status = 'dug')::int as dug_qty,
    count(*) filter (where t.status = 'shipped')::int as shipped_qty,
    count(*) filter (where t.status = 'planted')::int as planted_qty,

    count(*) filter (where t.status = 'selected_for_dig')::int as selected_for_dig_qty,
    count(*) filter (where t.status = 'root_prune')::int as root_prune_qty,
    count(*) filter (where t.status = 'ready_to_lift')::int as ready_to_lift_qty,
    count(*) filter (where t.status = 'rehab')::int as rehab_qty,
    count(*) filter (where t.status = 'dead')::int as dead_qty
  from public.tree_tags t
  where (p_zone_id is null or t.zone_id = p_zone_id)
    and (p_species_id is null or t.species_id = p_species_id);
$$;

grant execute on function public.get_tag_lifecycle_totals_v2(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
