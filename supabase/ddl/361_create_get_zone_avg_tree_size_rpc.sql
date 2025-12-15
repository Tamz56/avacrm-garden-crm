-- 361_create_get_zone_avg_tree_size_rpc.sql
-- Compute average tree size in a zone from tree_tags + stock_species.measure_by_height
-- Weighted by qty. Parses numeric from size_label/height_label (text).

create or replace function public.get_zone_avg_tree_size(p_zone_id uuid)
returns table (
  value numeric,
  unit text,
  source_count int,
  note text
)
language sql
stable
as $$
with tagged as (
  select
    t.zone_id,
    t.species_id,
    coalesce(t.qty, 1) as qty,
    s.measure_by_height,
    t.size_label,
    t.height_label
  from public.tree_tags t
  join public.stock_species s on s.id = t.species_id
  where t.zone_id = p_zone_id
),
unit_mix as (
  select
    sum(case when measure_by_height is true then 1 else 0 end) as height_species_rows,
    sum(case when measure_by_height is false then 1 else 0 end) as trunk_species_rows
  from tagged
),
parsed as (
  select
    qty,
    measure_by_height,
    -- parse numeric from label text; keep digits and dot, cast to numeric
    case
      when measure_by_height is true then nullif(regexp_replace(coalesce(height_label,''), '[^0-9\.]+', '', 'g'), '')::numeric
      else nullif(regexp_replace(coalesce(size_label,''),   '[^0-9\.]+', '', 'g'), '')::numeric
    end as n
  from tagged
),
usable as (
  select
    qty,
    n
  from parsed
  where n is not null and n > 0
),
agg as (
  select
    sum(n * qty)::numeric as weighted_sum,
    sum(qty)::int as total_qty
  from usable
)
select
  case
    when (select height_species_rows from unit_mix) > 0 and (select trunk_species_rows from unit_mix) > 0 then null
    when (select total_qty from agg) is null or (select total_qty from agg) = 0 then null
    else (select weighted_sum / total_qty from agg)
  end as value,
  case
    when (select height_species_rows from unit_mix) > 0 and (select trunk_species_rows from unit_mix) > 0 then null
    when (select total_qty from agg) is null or (select total_qty from agg) = 0 then null
    when (select height_species_rows from unit_mix) > 0 then 'm'
    else 'inch'
  end as unit,
  coalesce((select total_qty from agg), 0) as source_count,
  case
    when (select height_species_rows from unit_mix) > 0 and (select trunk_species_rows from unit_mix) > 0 then 'mixed_units'
    when (select total_qty from agg) is null or (select total_qty from agg) = 0 then 'no_size_data'
    else 'from_tree_tags'
  end as note;
$$;

-- Grant execute to authenticated users
grant execute on function public.get_zone_avg_tree_size(uuid) to authenticated;
