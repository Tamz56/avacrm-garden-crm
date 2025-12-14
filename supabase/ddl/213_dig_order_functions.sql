-- 213_dig_order_functions.sql

-- 1. get_deal_dig_orders
DROP FUNCTION IF EXISTS public.get_deal_dig_orders(UUID);

CREATE OR REPLACE FUNCTION public.get_deal_dig_orders(p_deal_id UUID)
RETURNS TABLE (
    id UUID,
    code TEXT,
    status TEXT,
    scheduled_date DATE,
    notes TEXT, -- Changed from note to notes
    tags_count BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        id,
        code,
        status,
        scheduled_date,
        notes, -- Changed from note to notes
        tags_count,
        created_at
    FROM public.view_deal_dig_orders
    WHERE deal_id = p_deal_id
    ORDER BY created_at DESC;
$$;

-- 2. create_dig_order_from_deal
DROP FUNCTION IF EXISTS public.create_dig_order_from_deal(UUID);

CREATE OR REPLACE FUNCTION public.create_dig_order_from_deal(p_deal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $fn$
DECLARE
    v_deal_exists    BOOLEAN;
    v_new_order_id   UUID;
    v_new_order_code TEXT;
    v_tag_ids        UUID[];
BEGIN
    -- 1. เช็คว่ามีดีลนี้จริงไหม
    SELECT EXISTS(
        SELECT 1
        FROM public.deals
        WHERE id = p_deal_id
    )
    INTO v_deal_exists;

    IF NOT v_deal_exists THEN
        RAISE EXCEPTION 'Deal not found';
    END IF;

    -- 2. ดึง Tag ที่จองอยู่กับดีลนี้
    SELECT ARRAY_AGG(id)
    INTO v_tag_ids
    FROM public.tree_tags
    WHERE deal_id = p_deal_id
      AND status = 'reserved';

    IF v_tag_ids IS NULL OR array_length(v_tag_ids, 1) = 0 THEN
        RAISE EXCEPTION
          'ยังไม่มี Tag ที่จองสำหรับดีลนี้ (หรือ Tag ทั้งหมดถูกจัดลงใบสั่งขุดไปแล้ว)';
    END IF;

    -- 3. สร้างรหัสรันนิ่ง DIG-YYYY-XXXX
    WITH next_seq AS (
        SELECT COUNT(*) + 1 AS next_val
        FROM public.dig_orders
        WHERE EXTRACT(YEAR FROM created_at)
              = EXTRACT(YEAR FROM CURRENT_DATE)
    )
    SELECT 'DIG-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
           LPAD(next_val::TEXT, 4, '0')
    INTO v_new_order_code
    FROM next_seq;

    -- 4. สร้างแถวใน dig_orders
    INSERT INTO public.dig_orders (deal_id, code, status, scheduled_date)
    VALUES (
        p_deal_id,
        v_new_order_code,
        'draft',
        CURRENT_DATE + INTERVAL '1 day'
    )
    RETURNING id INTO v_new_order_id;

    -- 5. สร้าง dig_order_items จาก Tag ทั้งหมด
    INSERT INTO public.dig_order_items (dig_order_id, tag_id)
    SELECT v_new_order_id, unnest(v_tag_ids);

    -- 6. อัปเดตสถานะ Tag
    UPDATE public.tree_tags
    SET status = 'dig_ordered'
    WHERE id = ANY(v_tag_ids);

    -- 7. ส่งผลกลับเป็น JSON
    RETURN jsonb_build_object(
        'id',    v_new_order_id,
        'code',  v_new_order_code,
        'count', array_length(v_tag_ids, 1)
    );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.create_dig_order_from_deal(UUID)
TO authenticated;

-- 3. update_dig_order_status
DROP FUNCTION IF EXISTS public.update_dig_order_status(uuid, text, date, text);

CREATE OR REPLACE FUNCTION public.update_dig_order_status(
    p_order_id      uuid,
    p_status        text,
    p_scheduled_date date,
    p_note          text
)
RETURNS public.dig_orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
    v_order public.dig_orders;
BEGIN
    UPDATE public.dig_orders d
    SET status         = COALESCE(p_status, d.status),
        scheduled_date = COALESCE(p_scheduled_date, d.scheduled_date),
        notes          = COALESCE(p_note, d.notes), -- Changed from note to notes
        updated_at     = now()
    WHERE d.id = p_order_id
    RETURNING * INTO v_order;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Dig order % not found', p_order_id;
    END IF;

    RETURN v_order;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.update_dig_order_status(
    uuid, text, date, text
) TO authenticated;
