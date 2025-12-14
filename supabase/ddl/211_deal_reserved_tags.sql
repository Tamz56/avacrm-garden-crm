-- 211_deal_reserved_tags.sql

-- View รวมข้อมูล Tag + พันธุ์ + โซน
CREATE OR REPLACE VIEW public.view_deal_reserved_tags AS
SELECT
    t.id,
    t.tag_code,
    t.status,
    t.size_label,
    t.qty,
    t.planting_row,
    t.planting_position,
    t.notes,
    t.deal_id,
    z.name      AS zone_name,
    s.name_th   AS species_name_th,
    s.name_en   AS species_name_en
FROM public.tree_tags t
LEFT JOIN public.stock_zones   z ON z.id = t.zone_id
LEFT JOIN public.stock_species s ON s.id = t.species_id;

-- RPC: ดึงเฉพาะ Tag ของดีลนั้น
CREATE OR REPLACE FUNCTION public.get_deal_reserved_tags(p_deal_id uuid)
RETURNS SETOF public.view_deal_reserved_tags
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT *
    FROM public.view_deal_reserved_tags
    WHERE deal_id = p_deal_id
    ORDER BY tag_code;
$$;

GRANT EXECUTE ON FUNCTION public.get_deal_reserved_tags(uuid)
TO authenticated;
