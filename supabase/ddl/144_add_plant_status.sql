-- Add plant_status column to stock_items
ALTER TABLE public.stock_items
ADD COLUMN IF NOT EXISTS plant_status TEXT; 
-- Recommended values: 'planted', 'balled', 'potted'

-- Update view_stock_overview to include plant_status
CREATE OR REPLACE VIEW public.view_stock_overview AS
SELECT
    i.id AS stock_item_id,
    s.id AS species_id,
    s.code AS species_code,
    s.name AS species_name,
    s.scientific_name,
    s.type AS species_type,
    z.id AS zone_id,
    z.name AS zone_name,
    z.farm_name,
    i.size_label,
    i.grade,
    i.quantity_available,
    i.quantity_reserved,
    i.base_price,
    i.status,
    i.trunk_size_inch,
    i.pot_size_inch,
    i.height_text,
    i.ready_date,
    i.plant_status,      -- Added column
    i.created_at,
    i.updated_at
FROM public.stock_items i
JOIN public.stock_species s ON i.species_id = s.id
JOIN public.stock_zones z ON i.zone_id = z.id
WHERE s.is_active = true;
