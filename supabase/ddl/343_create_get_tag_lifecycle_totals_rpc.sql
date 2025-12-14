-- 343_create_get_tag_lifecycle_totals_rpc.sql
-- Updated: Added new workflow status fields (selected_for_dig, root_prune, ready_to_lift, rehab, dead)

DROP FUNCTION IF EXISTS public.get_tag_lifecycle_totals(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_tag_lifecycle_totals(
    p_zone_id    uuid DEFAULT NULL,
    p_species_id uuid DEFAULT NULL
)
RETURNS TABLE (
    -- Existing fields (do not remove)
    total_tags       integer,
    in_zone_qty      integer,
    reserved_qty     integer,
    dig_ordered_qty  integer,
    dug_qty          integer,
    shipped_qty      integer,
    planted_qty      integer,
    cancelled_qty    integer,
    -- New workflow fields
    selected_for_dig_qty integer,
    root_prune_qty       integer,  -- Combined count for root_prune_1..4
    ready_to_lift_qty    integer,
    rehab_qty            integer,
    dead_qty             integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        -- Existing counts
        COUNT(*) FILTER (WHERE TRUE)::int                     AS total_tags,
        COUNT(*) FILTER (WHERE t.status = 'in_zone')::int     AS in_zone_qty,
        COUNT(*) FILTER (WHERE t.status = 'reserved')::int    AS reserved_qty,
        COUNT(*) FILTER (WHERE t.status = 'dig_ordered')::int AS dig_ordered_qty,
        COUNT(*) FILTER (WHERE t.status = 'dug')::int         AS dug_qty,
        COUNT(*) FILTER (WHERE t.status = 'shipped')::int     AS shipped_qty,
        COUNT(*) FILTER (WHERE t.status = 'planted')::int     AS planted_qty,
        COUNT(*) FILTER (WHERE t.status = 'cancelled')::int   AS cancelled_qty,
        -- New workflow counts
        COUNT(*) FILTER (WHERE t.status = 'selected_for_dig')::int AS selected_for_dig_qty,
        COUNT(*) FILTER (WHERE t.status IN ('root_prune_1', 'root_prune_2', 'root_prune_3', 'root_prune_4'))::int AS root_prune_qty,
        COUNT(*) FILTER (WHERE t.status = 'ready_to_lift')::int    AS ready_to_lift_qty,
        COUNT(*) FILTER (WHERE t.status = 'rehab')::int            AS rehab_qty,
        COUNT(*) FILTER (WHERE t.status = 'dead')::int             AS dead_qty
    FROM public.tree_tags t
    WHERE (p_zone_id    IS NULL OR t.zone_id    = p_zone_id)
      AND (p_species_id IS NULL OR t.species_id = p_species_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_tag_lifecycle_totals(uuid, uuid) TO authenticated;
