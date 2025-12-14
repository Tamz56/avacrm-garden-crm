-- supabase/ddl/233_create_set_stock_price_rpc.sql

CREATE OR REPLACE FUNCTION public.set_stock_price(
    _species_id UUID,
    _size_label TEXT,
    _grade TEXT,
    _base_price NUMERIC,
    _currency TEXT DEFAULT 'THB'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Mark old active prices for this combo as inactive
    UPDATE public.stock_price_list
    SET is_active = FALSE,
        valid_to = CURRENT_DATE
    WHERE species_id = _species_id
      AND size_label = _size_label
      AND grade = _grade
      AND is_active = TRUE;

    -- Insert new price
    INSERT INTO public.stock_price_list (
        species_id, size_label, grade, base_price, currency, is_active, valid_from
    ) VALUES (
        _species_id, _size_label, _grade, _base_price, _currency, TRUE, CURRENT_DATE
    );
END;
$$;
