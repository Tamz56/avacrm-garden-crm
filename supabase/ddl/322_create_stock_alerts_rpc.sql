-- 322_create_stock_alerts_rpc.sql

CREATE OR REPLACE FUNCTION public.get_stock_alerts(
    p_farm_name  text DEFAULT NULL,
    p_plot_type  uuid DEFAULT NULL,
    p_species_id uuid DEFAULT NULL
)
RETURNS TABLE (
    alert_type text,
    alert_severity int,
    alert_message text,

    zone_id uuid,
    zone_name text,
    farm_name text,
    plot_type text,

    species_id uuid,
    species_name_th text,
    species_name_en text,
    species_code text,

    size_label text,
    height_label text,

    grade_id uuid,
    grade_name text,
    grade_code text,

    total_qty int,
    available_qty int,
    reserved_qty int,
    dig_ordered_qty int,
    dug_qty int,
    shipped_qty int,
    planted_qty int
)
LANGUAGE sql
STABLE
AS $$
    WITH base AS (
        SELECT
            v.*
        FROM public.view_stock_zone_lifecycle v
        WHERE (p_farm_name IS NULL OR v.farm_name = p_farm_name)
          AND (p_plot_type IS NULL OR v.plot_type = p_plot_type)
          AND (p_species_id IS NULL OR v.species_id = p_species_id)
    ),
    alerts AS (
        -- 1) จองเกินของที่พร้อมขาย
        SELECT
            'over_reserved'::text     AS alert_type,
            3                         AS alert_severity,
            'จำนวนที่จองมากกว่าจำนวนพร้อมขาย'::text AS alert_message,
            b.*
        FROM base b
        WHERE b.reserved_qty > b.available_qty

        UNION ALL

        -- 2) มีต้นแต่ไม่มีของพร้อมขาย (เช่น ทั้งหมดถูกจอง/ในคำสั่งขุด ฯลฯ)
        SELECT
            'no_available'::text      AS alert_type,
            2                         AS alert_severity,
            'ไม่มีของพร้อมขายในขณะที่ยังมีต้นในระบบ'::text AS alert_message,
            b.*
        FROM base b
        WHERE b.tagged_total_qty > 0
          AND b.available_qty = 0

        UNION ALL

        -- 3) สต็อกใกล้หมด (available น้อยกว่า/เท่ากับ 3 ต้น)
        SELECT
            'low_stock'::text         AS alert_type,
            2                         AS alert_severity,
            'จำนวนพร้อมขายใกล้หมด (ต่ำกว่าเกณฑ์)'::text AS alert_message,
            b.*
        FROM base b
        WHERE b.available_qty > 0
          AND b.available_qty <= 3

        UNION ALL

        -- 4) มีใบสั่งขุดค้างอยู่
        SELECT
            'has_dig_order'::text     AS alert_type,
            1                         AS alert_severity,
            'มีต้นอยู่ในใบสั่งขุด (รอดำเนินการหรือกำลังดำเนินการ)'::text AS alert_message,
            b.*
        FROM base b
        WHERE b.dig_ordered_qty > 0
    )
    SELECT
        a.alert_type,
        a.alert_severity,
        a.alert_message,

        a.zone_id,
        a.zone_name,
        a.farm_name,
        a.plot_type::text,

        a.species_id,
        a.species_name_th,
        a.species_name_en,
        a.species_code,

        a.size_label,
        a.height_label,

        a.grade_id,
        a.grade_name,
        a.grade_code,

        a.tagged_total_qty AS total_qty,
        a.available_qty,
        a.reserved_qty,
        a.dig_ordered_qty,
        a.dug_qty,
        a.shipped_qty,
        a.planted_qty
    FROM alerts a
    ORDER BY
        a.alert_severity DESC,
        a.species_name_th NULLS LAST,
        a.zone_name,
        a.size_label,
        a.grade_name;
$$;

REVOKE ALL ON FUNCTION public.get_stock_alerts(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stock_alerts(text, uuid, uuid) TO authenticated;
