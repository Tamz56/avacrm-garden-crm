-- 340_tag_status_flow.sql
-- Tag Status Flow: in_zone → reserved → dig_ordered → dug → shipped → planted

-- 1) Add CHECK constraint for valid statuses
ALTER TABLE public.tree_tags
    DROP CONSTRAINT IF EXISTS tree_tags_status_check;

ALTER TABLE public.tree_tags
    ADD CONSTRAINT tree_tags_status_check
    CHECK (status IN (
        'in_zone',
        'reserved',
        'dig_ordered',
        'dug',
        'shipped',
        'planted',
        'cancelled',
        'available'  -- legacy support
    ));

-- 2) Central function to change tag status
CREATE OR REPLACE FUNCTION public.set_tree_tag_status(
    p_tag_ids        uuid[],
    p_new_status     text,
    p_source         text DEFAULT NULL,
    p_deal_id        uuid DEFAULT NULL,
    p_dig_order_id   uuid DEFAULT NULL,
    p_shipment_id    uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_allowed_status text[] := ARRAY[
        'in_zone','reserved','dig_ordered','dug','shipped','planted','cancelled','available'
    ];
    v_updated integer := 0;
BEGIN
    IF NOT (p_new_status = ANY (v_allowed_status)) THEN
        RAISE EXCEPTION 'Invalid status: %', p_new_status;
    END IF;

    UPDATE public.tree_tags t
    SET
        status        = p_new_status,
        deal_id       = COALESCE(p_deal_id, deal_id),
        dig_order_id  = COALESCE(p_dig_order_id, dig_order_id),
        shipment_id   = COALESCE(p_shipment_id, shipment_id),
        updated_at    = NOW()
    WHERE t.id = ANY (p_tag_ids);

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;

-- 3) Reserve tags for deal: in_zone → reserved
CREATE OR REPLACE FUNCTION public.reserve_tags_for_deal(
    p_deal_id  uuid,
    p_tag_ids  uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
    v_invalid_count integer;
BEGIN
    -- Check if any tags are NOT in_zone
    SELECT COUNT(*) INTO v_invalid_count
    FROM tree_tags t
    WHERE t.id = ANY (p_tag_ids)
      AND t.status NOT IN ('in_zone', 'available');

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'มี % Tag ที่ไม่อยู่ในสถานะพร้อมขาย ไม่สามารถจองได้', v_invalid_count;
    END IF;

    v_count := public.set_tree_tag_status(
        p_tag_ids      := p_tag_ids,
        p_new_status   := 'reserved',
        p_source       := 'reserve_deal',
        p_deal_id      := p_deal_id
    );

    RETURN v_count;
END;
$$;

-- 4) Unreserve tags (cancel reservation): reserved → in_zone
CREATE OR REPLACE FUNCTION public.unreserve_tags(
    p_tag_ids  uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
BEGIN
    v_count := public.set_tree_tag_status(
        p_tag_ids      := p_tag_ids,
        p_new_status   := 'in_zone',
        p_source       := 'unreserve'
    );

    -- Clear deal_id for unreserved tags
    UPDATE tree_tags SET deal_id = NULL WHERE id = ANY(p_tag_ids);

    RETURN v_count;
END;
$$;

-- 5) Set tags to dig_ordered: reserved/in_zone → dig_ordered
CREATE OR REPLACE FUNCTION public.set_tags_dig_ordered(
    p_dig_order_id uuid,
    p_tag_ids      uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
    v_invalid_count integer;
BEGIN
    -- Check if any tags are in invalid status for digging
    SELECT COUNT(*) INTO v_invalid_count
    FROM tree_tags t
    WHERE t.id = ANY (p_tag_ids)
      AND t.status NOT IN ('in_zone','reserved','available');

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'มี % Tag ที่ไม่สามารถใส่ในใบสั่งขุดได้ (สถานะไม่ถูกต้อง)', v_invalid_count;
    END IF;

    v_count := public.set_tree_tag_status(
        p_tag_ids      := p_tag_ids,
        p_new_status   := 'dig_ordered',
        p_source       := 'create_dig_order',
        p_dig_order_id := p_dig_order_id
    );

    RETURN v_count;
END;
$$;

-- 6) Mark tags as dug: dig_ordered → dug
CREATE OR REPLACE FUNCTION public.mark_tags_dug(
    p_dig_order_id uuid,
    p_tag_ids      uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.set_tree_tag_status(
        p_tag_ids      := p_tag_ids,
        p_new_status   := 'dug',
        p_source       := 'confirm_dug',
        p_dig_order_id := p_dig_order_id
    );
END;
$$;

-- 7) Mark tags as shipped: dug → shipped
CREATE OR REPLACE FUNCTION public.mark_tags_shipped(
    p_shipment_id uuid,
    p_tag_ids     uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.set_tree_tag_status(
        p_tag_ids      := p_tag_ids,
        p_new_status   := 'shipped',
        p_source       := 'confirm_shipment',
        p_shipment_id  := p_shipment_id
    );
END;
$$;

-- 8) Mark tags as planted: shipped → planted
CREATE OR REPLACE FUNCTION public.mark_tags_planted(
    p_deal_id  uuid,
    p_tag_ids  uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.set_tree_tag_status(
        p_tag_ids      := p_tag_ids,
        p_new_status   := 'planted',
        p_source       := 'confirm_planted',
        p_deal_id      := p_deal_id
    );
END;
$$;

-- 9) Cancel tags: any → cancelled
CREATE OR REPLACE FUNCTION public.cancel_tags(
    p_tag_ids  uuid[],
    p_reason   text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.set_tree_tag_status(
        p_tag_ids      := p_tag_ids,
        p_new_status   := 'cancelled',
        p_source       := COALESCE(p_reason, 'cancelled')
    );
END;
$$;
