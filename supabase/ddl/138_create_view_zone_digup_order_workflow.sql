-- 138_create_view_zone_digup_order_workflow.sql
-- View for zone digup order items with tag status for workflow tracking

CREATE OR REPLACE VIEW public.view_zone_digup_order_workflow AS
SELECT
    i.id AS item_id,
    i.zone_digup_order_id AS order_id,
    o.zone_id,
    o.digup_date,
    o.status AS order_status,
    o.notes AS order_notes,
    o.source_plan_id,
    
    t.id AS tag_id,
    t.tag_code,
    t.status AS tag_status,
    t.size_label,
    t.grade,
    
    s.name_th AS species_name_th,
    s.name_en AS species_name_en,
    z.name AS zone_name,
    
    i.qty,
    i.notes AS item_notes,
    i.created_at
FROM public.zone_digup_order_items i
JOIN public.zone_digup_orders o ON o.id = i.zone_digup_order_id
JOIN public.tree_tags t ON t.id = i.tag_id
LEFT JOIN public.stock_species s ON s.id = t.species_id
LEFT JOIN public.stock_zones z ON z.id = t.zone_id;

GRANT SELECT ON public.view_zone_digup_order_workflow TO authenticated;
