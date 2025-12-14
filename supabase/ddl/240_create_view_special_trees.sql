create or replace view public.view_special_trees as
select
  t.id,
  t.tag_code,
  t.tree_category,
  t.display_name,
  t.feature_notes,
  t.primary_image_url,
  t.extra_image_urls,
  t.zone_id,
  z.name as zone_name,
  f.name as farm_name,
  t.species_id,
  s.name_th as species_name_th,
  s.name_en as species_name_en,
  s.species_code,
  t.size_label,
  t.planting_row,
  t.planting_position,
  t.status,
  t.notes as note,
  t.created_at
from public.tree_tags t
left join public.zones z on t.zone_id = z.id
left join public.farms f on z.farm_id = f.id
left join public.species s on t.species_id = s.id
where t.tree_category is not null and t.tree_category != '';
