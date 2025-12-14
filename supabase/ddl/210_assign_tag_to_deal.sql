-- 210_assign_tag_to_deal.sql

-- 1) ฟังก์ชันผูก Tag เข้ากับดีล
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
    -- หา Tag ตามรหัส และล็อกแถวกันชนกัน
    SELECT *
    INTO v_tag
    FROM public.tree_tags
    WHERE tag_code = p_tag_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tag % not found', p_tag_code;
    END IF;

    -- ตรวจสอบสถานะ ว่าต้องยัง "อยู่ในแปลง" เท่านั้น
    IF v_tag.status IS DISTINCT FROM 'in_zone' THEN
        RAISE EXCEPTION 'Tag % has status %, cannot assign to deal',
            p_tag_code, v_tag.status;
    END IF;

    -- อัปเดต Tag -> reserved + ผูกดีล
    UPDATE public.tree_tags
    SET status  = 'reserved',
        deal_id = p_deal_id
    WHERE id = v_tag.id;

    -- ⬇️ ถ้าตาราง stock_items ของคุณมีคอลัมน์ zone_id, species_id, size_label,
    --     quantity_in_stock, quantity_reserved ให้ใช้บล็อกนี้ได้
    -- UPDATE public.stock_items si
    -- SET quantity_in_stock = GREATEST(0, si.quantity_in_stock - v_tag.qty),
    --     quantity_reserved = COALESCE(si.quantity_reserved, 0) + v_tag.qty
    -- WHERE si.zone_id    = v_tag.zone_id
    --   AND si.species_id = v_tag.species_id
    --   AND si.size_label = v_tag.size_label;

    -- คืนค่า Tag ที่อัปเดตแล้ว
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

GRANT EXECUTE ON FUNCTION public.assign_tag_to_deal(uuid, text)
TO authenticated;
