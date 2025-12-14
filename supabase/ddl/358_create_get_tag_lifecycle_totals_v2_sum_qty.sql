-- 358_create_get_tag_lifecycle_totals_v2_sum_qty.sql
-- Uses SUM(COALESCE(qty,1)) instead of COUNT(*) to handle tags with qty > 1

DROP FUNCTION IF EXISTS public.get_tag_lifecycle_totals_v2(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_tag_lifecycle_totals_v2(
    p_zone_id    uuid DEFAULT NULL,
    p_species_id uuid DEFAULT NULL
)
RETURNS TABLE (
    -- Keep same field names for compatibility
    total_tags       integer,
    in_zone_qty      integer,
    available_qty    integer,  -- NEW: "พร้อมขาย" = in_zone (not reserved/dig_ordered)
    reserved_qty     integer,
    dig_ordered_qty  integer,
    dug_qty          integer,
    shipped_qty      integer,
    planted_qty      integer,
    cancelled_qty    integer,
    -- Workflow fields
    selected_for_dig_qty integer,
    root_prune_qty       integer,
    ready_to_lift_qty    integer,
    rehab_qty            integer,
    dead_qty             integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        -- Use SUM(COALESCE(qty,1)) to count actual trees, not rows
        SUM(COALESCE(t.qty, 1))::int AS total_tags,
        SUM(CASE WHEN t.status = 'in_zone' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS in_zone_qty,
        -- available_qty = in_zone only (พร้อมขาย = ยังไม่จอง/ยังไม่สั่งขุด)
        SUM(CASE WHEN t.status = 'in_zone' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS available_qty,
        SUM(CASE WHEN t.status = 'reserved' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS reserved_qty,
        SUM(CASE WHEN t.status = 'dig_ordered' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS dig_ordered_qty,
        SUM(CASE WHEN t.status = 'dug' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS dug_qty,
        SUM(CASE WHEN t.status = 'shipped' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS shipped_qty,
        SUM(CASE WHEN t.status = 'planted' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS planted_qty,
        SUM(CASE WHEN t.status = 'cancelled' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS cancelled_qty,
        -- Workflow fields
        SUM(CASE WHEN t.status = 'selected_for_dig' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS selected_for_dig_qty,
        SUM(CASE WHEN t.status IN ('root_prune_1', 'root_prune_2', 'root_prune_3', 'root_prune_4') THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS root_prune_qty,
        SUM(CASE WHEN t.status = 'ready_to_lift' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS ready_to_lift_qty,
        SUM(CASE WHEN t.status = 'rehab' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS rehab_qty,
        SUM(CASE WHEN t.status = 'dead' THEN COALESCE(t.qty, 1) ELSE 0 END)::int AS dead_qty
    FROM public.tree_tags t
    WHERE (p_zone_id    IS NULL OR t.zone_id    = p_zone_id)
      AND (p_species_id IS NULL OR t.species_id = p_species_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_tag_lifecycle_totals_v2(uuid, uuid) TO authenticated;
