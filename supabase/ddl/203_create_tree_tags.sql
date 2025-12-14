-- 203_create_tree_tags.sql

-- 1) Drop table (if exists)
DROP TABLE IF EXISTS public.tree_tags CASCADE;

-- 2) Create base table for QR / Tag / NFC
CREATE TABLE public.tree_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Code for QR / NFC / Tag
    tag_code TEXT NOT NULL UNIQUE,

    -- Zone / Plot
    zone_id UUID NOT NULL REFERENCES public.stock_zones(id) ON DELETE CASCADE,

    -- Species Info
    species_id UUID NOT NULL REFERENCES public.stock_species(id),
    size_label TEXT,              -- e.g. '3"', '4"'

    -- Quantity represented by this tag (usually 1)
    qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),

    -- Position in plot
    planting_row INTEGER,         -- Row number
    planting_position INTEGER,    -- Position in row

    -- Status (enum text)
    status TEXT NOT NULL DEFAULT 'in_zone',
    -- Suggested values: 'in_zone', 'reserved', 'dug', 'shipped', 'planted_customer', 'lost', 'dead'

    -- Links to other modules
    stock_item_id UUID REFERENCES public.stock_items(id),
    deal_id UUID REFERENCES public.deals(id),
    shipment_id UUID REFERENCES public.shipments(id),

    -- General notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX tree_tags_tag_code_idx ON public.tree_tags (tag_code);
CREATE INDEX tree_tags_zone_idx ON public.tree_tags (zone_id);
CREATE INDEX tree_tags_species_idx ON public.tree_tags (species_id);
CREATE INDEX tree_tags_status_idx ON public.tree_tags (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tree_tags TO authenticated;
GRANT SELECT ON public.tree_tags TO service_role;

-- 3) View for UI
DROP VIEW IF EXISTS public.view_zone_tree_tags;

CREATE VIEW public.view_zone_tree_tags AS
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

GRANT SELECT ON public.view_zone_tree_tags TO authenticated;
GRANT SELECT ON public.view_zone_tree_tags TO service_role;
