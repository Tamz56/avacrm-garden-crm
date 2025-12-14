-- Create view for Zone Stock Summary
-- Aggregates stock items by zone to show total trees, available, reserved, and sold (placeholder)

CREATE OR REPLACE VIEW public.v_zone_stock_summary AS
SELECT
    z.id AS zone_id,
    z.name AS zone_name,
    COUNT(si.id) AS item_count,
    COALESCE(SUM(si.quantity_available + si.quantity_reserved), 0) AS total_trees,
    COALESCE(SUM(si.quantity_available), 0) AS available_trees,
    COALESCE(SUM(si.quantity_reserved), 0) AS reserved_trees,
    0 AS sold_trees -- Placeholder as we don't have a direct link to sold items in this view yet
FROM
    public.stock_zones z
LEFT JOIN
    public.stock_items si ON z.id = si.zone_id
GROUP BY
    z.id, z.name;

-- Grant access to authenticated users
GRANT SELECT ON public.v_zone_stock_summary TO authenticated;
