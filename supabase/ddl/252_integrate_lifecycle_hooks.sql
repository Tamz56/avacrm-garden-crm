-- 252_integrate_lifecycle_hooks.sql

-- 1. Update assign_tag_to_deal to use recalc
CREATE OR REPLACE FUNCTION public.assign_tag_to_deal(
    p_deal_id  uuid,
    p_tag_code text
)
RETURNS TABLE (
    id          uuid,
    tag_code    text,
    status      text,
    species_id  uuid,
    size_label  text,
    qty         integer,
    zone_id     uuid,
    deal_id     uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tag public.tree_tags;
BEGIN
    -- Find Tag
    SELECT *
    INTO v_tag
    FROM public.tree_tags
    WHERE tag_code = p_tag_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tag % not found', p_tag_code;
    END IF;

    -- Check if already reserved (optional, but good for safety)
    -- But recalc handles logic, so we just check if it's "available" enough to be reserved?
    -- User logic: "If deal... -> reserved".
    -- If it's already in a deal, we might want to block?
    -- For now, we keep the original check "in_zone" (available)
    IF v_tag.status IS DISTINCT FROM 'in_zone' THEN
        RAISE EXCEPTION 'Tag % has status %, cannot assign to deal',
            p_tag_code, v_tag.status;
    END IF;

    -- Update Deal ID
    UPDATE public.tree_tags
    SET deal_id = p_deal_id
    WHERE id = v_tag.id;

    -- Recalculate Status
    PERFORM public.recalc_tree_tag_status(v_tag.id);

    -- Return updated tag
    RETURN QUERY
    SELECT t.id,
           t.tag_code,
           t.status,
           t.species_id,
           t.size_label,
           t.qty,
           t.zone_id,
           t.deal_id
    FROM public.tree_tags t
    WHERE t.id = v_tag.id;
END;
$$;

-- 2. Update create_dig_order_from_deal to use recalc
CREATE OR REPLACE FUNCTION public.create_dig_order_from_deal(
    p_deal_id UUID,
    p_dig_purpose TEXT DEFAULT 'to_customer'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $fn$
DECLARE
    v_deal_exists    BOOLEAN;
    v_new_order_id   UUID;
    v_new_order_code TEXT;
    v_tag_ids        UUID[];
BEGIN
    -- Check Deal
    SELECT EXISTS(SELECT 1 FROM public.deals WHERE id = p_deal_id) INTO v_deal_exists;
    IF NOT v_deal_exists THEN RAISE EXCEPTION 'Deal not found'; END IF;

    -- Get Reserved Tags
    SELECT ARRAY_AGG(id)
    INTO v_tag_ids
    FROM public.tree_tags
    WHERE deal_id = p_deal_id
      AND status = 'reserved';

    IF v_tag_ids IS NULL OR array_length(v_tag_ids, 1) = 0 THEN
        RAISE EXCEPTION 'No reserved tags found for this deal (or all already ordered)';
    END IF;

    -- Generate Code
    WITH next_seq AS (
        SELECT COUNT(*) + 1 AS next_val
        FROM public.dig_orders
        WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    )
    SELECT 'DIG-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_val::TEXT, 4, '0')
    INTO v_new_order_code
    FROM next_seq;

    -- Create Dig Order
    INSERT INTO public.dig_orders (deal_id, code, status, scheduled_date, dig_purpose)
    VALUES (p_deal_id, v_new_order_code, 'draft', CURRENT_DATE + INTERVAL '1 day', p_dig_purpose)
    RETURNING id INTO v_new_order_id;

    -- Create Items
    INSERT INTO public.dig_order_items (dig_order_id, tag_id)
    SELECT v_new_order_id, unnest(v_tag_ids);

    -- Recalculate Status for all tags
    PERFORM public.recalc_tree_tags_status(v_tag_ids);

    RETURN jsonb_build_object(
        'id',    v_new_order_id,
        'code',  v_new_order_code,
        'count', array_length(v_tag_ids, 1)
    );
END;
$fn$;

-- 3. Trigger for Dig Orders (Status Change)
CREATE OR REPLACE FUNCTION public.trg_recalc_tags_on_dig_order_update()
RETURNS TRIGGER AS $$
DECLARE
    v_tag_ids UUID[];
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Find all tags in this order
        SELECT ARRAY_AGG(tag_id) INTO v_tag_ids
        FROM public.dig_order_items
        WHERE dig_order_id = NEW.id;

        IF v_tag_ids IS NOT NULL THEN
            PERFORM public.recalc_tree_tags_status(v_tag_ids);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dig_order_status_change ON public.dig_orders;
CREATE TRIGGER trg_dig_order_status_change
AFTER UPDATE OF status ON public.dig_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_tags_on_dig_order_update();

-- 4. Trigger for Deal Shipments (Status Change)
CREATE OR REPLACE FUNCTION public.trg_recalc_tags_on_shipment_update()
RETURNS TRIGGER AS $$
DECLARE
    v_tag_ids UUID[];
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Find all tags assigned to this shipment
        SELECT ARRAY_AGG(id) INTO v_tag_ids
        FROM public.tree_tags
        WHERE shipment_id = NEW.id;

        IF v_tag_ids IS NOT NULL THEN
            PERFORM public.recalc_tree_tags_status(v_tag_ids);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shipment_status_change ON public.deal_shipments;
CREATE TRIGGER trg_shipment_status_change
AFTER UPDATE OF status ON public.deal_shipments
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_tags_on_shipment_update();

-- 5. Trigger for Deals (Stage/Status Change)
CREATE OR REPLACE FUNCTION public.trg_recalc_tags_on_deal_update()
RETURNS TRIGGER AS $$
DECLARE
    v_tag_ids UUID[];
BEGIN
    IF (OLD.stage IS DISTINCT FROM NEW.stage) OR (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Find all tags assigned to this deal
        SELECT ARRAY_AGG(id) INTO v_tag_ids
        FROM public.tree_tags
        WHERE deal_id = NEW.id;

        IF v_tag_ids IS NOT NULL THEN
            PERFORM public.recalc_tree_tags_status(v_tag_ids);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deal_status_change ON public.deals;
CREATE TRIGGER trg_deal_status_change
AFTER UPDATE OF stage, status ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_tags_on_deal_update();

-- 6. Trigger for Tree Tags (FK Change)
-- If deal_id or shipment_id changes, recalc status
CREATE OR REPLACE FUNCTION public.trg_recalc_tag_on_fk_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.deal_id IS DISTINCT FROM NEW.deal_id) OR 
       (OLD.shipment_id IS DISTINCT FROM NEW.shipment_id) THEN
       
       -- Recalc NEW tag row
       PERFORM public.recalc_tree_tag_status(NEW.id);
       
       -- Note: If we moved it FROM another deal/shipment, the OLD state is gone from this row,
       -- so we only need to recalc the current row to reflect its new state.
       -- The logic in recalc checks the CURRENT FKs.
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tree_tag_fk_change ON public.tree_tags;
CREATE TRIGGER trg_tree_tag_fk_change
AFTER UPDATE OF deal_id, shipment_id ON public.tree_tags
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_tag_on_fk_change();
