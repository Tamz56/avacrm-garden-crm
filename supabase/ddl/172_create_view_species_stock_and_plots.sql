-- 172_create_view_species_stock_and_plots.sql

CREATE OR REPLACE VIEW public.view_species_stock_and_plots AS
SELECT
    si.species_id,
    ss.name_th AS species_name_th,
    ss.name_en AS species_name_en,
    sp.code AS species_code,
    si.size_label,
    
    -- Stock Counts (No Zone)
    COUNT(CASE WHEN si.zone_id IS NULL THEN 1 END) AS total_stock_trees,
    COUNT(CASE WHEN si.zone_id IS NULL AND si.status = 'available' THEN 1 END) AS available_trees,
    COUNT(CASE WHEN si.zone_id IS NULL AND si.status = 'reserved' THEN 1 END) AS reserved_trees,
    
    -- Shipped (Anywhere, but usually from stock)
    COUNT(CASE WHEN si.status = 'shipped' THEN 1 END) AS shipped_trees,
    
    -- Planted in Plots (Has Zone)
    -- Exclude shipped items if they are technically still linked to a zone but shipped (unlikely but safe)
    COUNT(CASE WHEN si.zone_id IS NOT NULL AND si.status != 'shipped' THEN 1 END) AS planted_in_plots

FROM public.stock_items si
LEFT JOIN public.stock_species ss ON si.species_id = ss.id
-- Try to match with product definition if exists
LEFT JOIN public.stock_products sp ON si.species_id = sp.species_id AND si.size_label = sp.size_label

WHERE si.is_active = true
GROUP BY
    si.species_id,
    ss.name_th,
    ss.name_en,
    sp.code,
    si.size_label;

GRANT SELECT ON public.view_species_stock_and_plots TO authenticated;
