-- 215_view_dig_order_detail.sql

CREATE OR REPLACE VIEW public.view_dig_order_detail AS
SELECT
    o.id              AS order_id,
    o.code,
    o.status,
    o.scheduled_date,
    o.notes           AS notes, -- Changed from note to notes
    o.deal_id,
    d.title           AS deal_title,
    d.customer_name   AS customer_name,

    t.id              AS tag_id,
    t.tag_code,
    t.size_label,
    t.qty,
    t.planting_row,
    t.planting_position,
    t.note            AS tag_notes,

    s.name_th         AS species_name_th,
    s.name_en         AS species_name_en,
    z.name            AS zone_name,

    o.created_at
FROM public.dig_orders       o
JOIN public.deals            d   ON d.id = o.deal_id
JOIN public.dig_order_items  doi ON doi.dig_order_id = o.id
JOIN public.tree_tags        t   ON t.id = doi.tag_id
LEFT JOIN public.stock_species s ON s.id = t.species_id
LEFT JOIN public.stock_zones   z ON z.id = t.zone_id;
