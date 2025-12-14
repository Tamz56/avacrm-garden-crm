CREATE TABLE IF NOT EXISTS public.planting_plot_inventory (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plot_id         uuid NOT NULL,        -- อ้างอิงไปยังแปลง / zone / stock_zones
    species_id      uuid NOT NULL,
    size_label      text NOT NULL,        -- "5", "10", "15" นิ้ว ฯลฯ
    planted_qty     integer NOT NULL,     -- จำนวนที่ปลูกทั้งหมด
    planted_date    date,                 -- วันที่ปลูก/ลงดิน
    note            text,

    -- สำหรับเชื่อมกับ Tag ในอนาคต
    created_tag_qty integer NOT NULL DEFAULT 0,  -- สร้าง Tag ไปแล้วกี่ต้น
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE OR REPLACE VIEW public.view_plot_tree_inventory AS
SELECT
    i.id,
    i.plot_id,
    z.name         AS plot_name,
    i.species_id,
    s.name_th      AS species_name_th,
    i.size_label,
    i.planted_qty,
    i.created_tag_qty,
    (i.planted_qty - i.created_tag_qty) AS remaining_for_tag,
    i.planted_date,
    i.note
FROM planting_plot_inventory i
LEFT JOIN stock_zones   z ON z.id = i.plot_id
LEFT JOIN stock_species s ON s.id = i.species_id;

CREATE OR REPLACE FUNCTION public.create_tags_from_plot_inventory(
    p_inventory_id uuid,
    p_create_qty   integer,
    p_tree_category text DEFAULT 'normal',        -- 'normal' / 'special' / 'vip' / 'demo' ฯลฯ
    p_default_status text DEFAULT 'in_zone'       -- สถานะตั้งต้น
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec planting_plot_inventory;
    v_created integer := 0;
BEGIN
    SELECT * INTO v_rec
    FROM planting_plot_inventory
    WHERE id = p_inventory_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory row not found';
    END IF;

    IF p_create_qty <= 0 THEN
        RAISE EXCEPTION 'Create qty must be > 0';
    END IF;

    IF v_rec.planted_qty - v_rec.created_tag_qty < p_create_qty THEN
        RAISE EXCEPTION 'Not enough remaining trees in this plot. Remaining = %',
            v_rec.planted_qty - v_rec.created_tag_qty;
    END IF;

    -- ลูปสร้าง Tag ตามจำนวนที่ขอ
    FOR i IN 1..p_create_qty LOOP
        INSERT INTO public.tree_tags (
            zone_id,
            species_id,
            size_label,
            status,
            tree_category
        ) VALUES (
            v_rec.plot_id,
            v_rec.species_id,
            v_rec.size_label,
            p_default_status,
            p_tree_category
        );
        v_created := v_created + 1;
    END LOOP;

    -- อัปเดตจำนวน Tag ที่สร้างแล้ว
    UPDATE planting_plot_inventory
    SET created_tag_qty = created_tag_qty + v_created,
        updated_at = now()
    WHERE id = v_rec.id;

    RETURN v_created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tags_from_plot_inventory(uuid, integer, text, text)
TO authenticated;
