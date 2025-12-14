-- 196_create_view_zone_digup_orders.sql

DROP VIEW IF EXISTS public.view_zone_digup_orders;

CREATE OR REPLACE VIEW public.view_zone_digup_orders AS
SELECT
    o.id,
    o.zone_id,
    z.name AS zone_name,
    o.digup_date,
    o.qty,
    o.status,
    o.notes,
    o.species_id,
    s.name AS species_name_th,
    o.size_label,
    o.created_at,
    o.updated_at
FROM public.zone_digup_orders o
LEFT JOIN public.stock_zones z ON o.zone_id = z.id
LEFT JOIN public.stock_species s ON o.species_id = s.id;

GRANT SELECT ON public.view_zone_digup_orders TO authenticated;

NOTIFY pgrst, 'reload schema';
