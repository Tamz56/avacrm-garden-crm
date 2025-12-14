-- 247_add_height_column.sql

-- 1. Add height_label to planting_plot_inventory
ALTER TABLE public.planting_plot_inventory
ADD COLUMN height_label text;

-- 2. Add height_label to tree_tags
ALTER TABLE public.tree_tags
ADD COLUMN height_label text;

-- 3. Update view_plot_tree_inventory
DROP VIEW IF EXISTS public.view_plot_tree_inventory;
CREATE OR REPLACE VIEW public.view_plot_tree_inventory AS
SELECT
    i.id,
    i.plot_id,
    z.name         AS plot_name,
    i.species_id,
    s.name_th      AS species_name_th,
    i.size_label,
    i.height_label, -- Added
    i.planted_qty,
    i.created_tag_qty,
    (i.planted_qty - i.created_tag_qty) AS remaining_for_tag,
    i.planted_date,
    i.note
FROM planting_plot_inventory i
LEFT JOIN stock_zones   z ON z.id = i.plot_id
LEFT JOIN stock_species s ON s.id = i.species_id;

-- 4. Update view_zone_tree_tags
DROP VIEW IF EXISTS public.view_zone_tree_tags;
CREATE OR REPLACE VIEW public.view_zone_tree_tags AS
SELECT
    t.id,
    t.tag_code,
    t.zone_id,
    z.name        AS zone_name,
    z.farm_name,
    t.species_id,
    s.name_th     AS species_name_th,
    s.name_en     AS species_name_en,
    t.size_label,
    t.height_label, -- Added
    t.qty,
    t.status,
    t.planting_row,
    t.planting_position,
    t.stock_item_id,
    t.deal_id,
    t.shipment_id,
    t.notes,
    t.created_at,
    t.updated_at
FROM public.tree_tags t
JOIN public.stock_zones   z ON t.zone_id   = z.id
JOIN public.stock_species s ON t.species_id = s.id;

-- 5. Update create_tags_from_plot_inventory function
CREATE OR REPLACE FUNCTION public.create_tags_from_plot_inventory(
    p_inventory_id uuid,
    p_create_qty   integer,
    p_tree_category text DEFAULT 'normal',
    p_default_status text DEFAULT 'in_zone'
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

    -- Loop to create tags
    FOR i IN 1..p_create_qty LOOP
        INSERT INTO public.tree_tags (
            zone_id,
            species_id,
            size_label,
            height_label, -- Added
            status,
            tree_category
        ) VALUES (
            v_rec.plot_id,
            v_rec.species_id,
            v_rec.size_label,
            v_rec.height_label, -- Added
            p_default_status,
            p_tree_category
        );
        v_created := v_created + 1;
    END LOOP;

    -- Update inventory count
    UPDATE planting_plot_inventory
    SET created_tag_qty = created_tag_qty + v_created,
        updated_at = now()
    WHERE id = v_rec.id;

    RETURN v_created;
END;
$$;
