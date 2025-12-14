-- 201_create_view_zone_mismatch_details.sql

DROP VIEW IF EXISTS public.view_zone_tree_stock_vs_inspection;

CREATE VIEW public.view_zone_tree_stock_vs_inspection AS
WITH system_stock AS (
    SELECT
        zone_id,
        species_id,
        size_label,
        SUM(remaining_in_ground) AS system_qty
    FROM public.view_zone_tree_inventory_flow
    GROUP BY zone_id, species_id, size_label
),
inspection_stock AS (
    SELECT
        zone_id,
        species_id,
        size_label,
        total_estimated_qty AS inspected_qty,
        last_inspection_date
    FROM public.view_zone_tree_inspection_summary
)
SELECT
    COALESCE(s.zone_id, i.zone_id) AS zone_id,
    COALESCE(s.species_id, i.species_id) AS species_id,
    COALESCE(s.size_label, i.size_label) AS size_label,
    
    COALESCE(s.system_qty, 0) AS system_qty,
    COALESCE(i.inspected_qty, 0) AS inspected_qty,
    
    (COALESCE(i.inspected_qty, 0) - COALESCE(s.system_qty, 0)) AS diff_qty,
    
    i.last_inspection_date

FROM system_stock s
FULL OUTER JOIN inspection_stock i
    ON s.zone_id = i.zone_id
    AND s.species_id = i.species_id
    AND COALESCE(s.size_label, '') = COALESCE(i.size_label, '');

GRANT SELECT ON public.view_zone_tree_stock_vs_inspection TO authenticated;
GRANT SELECT ON public.view_zone_tree_stock_vs_inspection TO service_role;
