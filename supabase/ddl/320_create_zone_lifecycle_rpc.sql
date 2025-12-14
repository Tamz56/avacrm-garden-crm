-- 320_create_zone_lifecycle_rpc.sql

CREATE OR REPLACE FUNCTION public.get_zone_lifecycle(
    p_farm_name  text DEFAULT NULL,
    p_plot_type  uuid DEFAULT NULL,
    p_species_id uuid DEFAULT NULL,
    p_size_label text DEFAULT NULL,
    p_grade_id   uuid DEFAULT NULL
)
RETURNS TABLE (
    zone_id uuid,
    zone_name text,
    farm_name text,
    plot_type uuid,

    species_id uuid,
    species_name_th text,
    species_name_en text,
    species_code text,
    measure_by_height boolean,

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
    SELECT
        v.zone_id,
        v.zone_name,
        v.farm_name,
        v.plot_type,

        v.species_id,
        v.species_name_th,
        v.species_name_en,
        v.species_code,
        v.measure_by_height,

        v.size_label,
        v.height_label,

        v.grade_id,
        v.grade_name,
        v.grade_code,

        v.tagged_total_qty AS total_qty,
        v.available_qty,
        v.reserved_qty,
        v.dig_ordered_qty,
        v.dug_qty,
        v.shipped_qty,
        v.planted_qty
    FROM public.view_stock_zone_lifecycle v
    WHERE (p_farm_name  IS NULL OR v.farm_name  = p_farm_name)
      AND (p_plot_type  IS NULL OR v.plot_type  = p_plot_type)
      AND (p_species_id IS NULL OR v.species_id = p_species_id)
      AND (p_size_label IS NULL OR v.size_label = p_size_label)
      AND (p_grade_id   IS NULL OR v.grade_id   = p_grade_id);
$$;

-- สิทธิ์การเรียกใช้ (ปรับตามโครง RLS ของคุณ)
REVOKE ALL ON FUNCTION public.get_zone_lifecycle(text, uuid, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_zone_lifecycle(text, uuid, uuid, text, uuid) TO authenticated;

