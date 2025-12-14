-- 1. View for Detail separate A/B
create or replace view public.view_zone_tree_inspections as
select
    zti.id,
    zti.zone_id,
    zti.species_id,
    sp.name_th as species_name_th,
    zti.size_label,
    zti.grade,
    zti.estimated_qty,
    zti.inspection_date,
    zti.notes
from zone_tree_inspections zti
left join stock_species sp on sp.id = zti.species_id;

-- 2. View for Summary by size
create or replace view public.view_zone_tree_inspection_summary as
select
  zti.zone_id,
  zti.species_id,
  sp.name_th as species_name_th,
  sp.name_en as species_name_en,
  zti.size_label,
  sum(zti.estimated_qty) as total_estimated_qty,
  max(zti.inspection_date) as last_inspection_date,
  string_agg(distinct zti.grade, '/' order by zti.grade)
    filter (where zti.grade is not null) as grades
from zone_tree_inspections zti
left join stock_species sp on sp.id = zti.species_id
group by
  zti.zone_id,
  zti.species_id,
  sp.name_th,
  sp.name_en,
  zti.size_label;

-- 3. Cleanup old mock data (optional but requested)
delete from zone_tree_inspections
where size_label = '4'
  and (grade is null or grade = '4');
