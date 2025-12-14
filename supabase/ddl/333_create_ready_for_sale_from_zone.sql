-- 333_create_ready_for_sale_from_zone.sql

-- ฟังก์ชัน: เพิ่มต้นไม้ "พร้อมขาย" จากข้อมูลแปลงปลูกเข้า tree_tags
-- ให้เรียกจากหน้า Zone Detail (จัดการแปลง)
-- ใช้ tree_tags เพราะ view_stock_zone_lifecycle ดึงข้อมูลจาก tree_tags

CREATE OR REPLACE FUNCTION public.add_ready_stock_from_zone(
    p_zone_id    uuid,
    p_species_id uuid,
    p_size_label text,
    p_grade_id   uuid,
    p_qty        int
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_i int;
BEGIN
    IF p_qty <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    -- สร้าง tree_tag ทีละ record (qty = 1 ต่อ tag)
    FOR v_i IN 1..p_qty LOOP
        INSERT INTO public.tree_tags (
            tag_code,
            zone_id,
            species_id,
            size_label,
            grade,
            qty,
            status,
            notes,
            created_at,
            updated_at
        ) VALUES (
            'ZS-' || substr(gen_random_uuid()::text, 1, 8),  -- auto tag_code
            p_zone_id,
            p_species_id,
            p_size_label,
            p_grade_id,
            1,
            'available',                                      -- status พร้อมขาย
            'เพิ่มจากแปลงปลูก (Zone Inventory)',
            NOW(),
            NOW()
        );
    END LOOP;

END;
$$;

REVOKE ALL ON FUNCTION public.add_ready_stock_from_zone(uuid, uuid, text, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_ready_stock_from_zone(uuid, uuid, text, uuid, int) TO authenticated;
