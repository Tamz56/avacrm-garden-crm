-- 126_check_columns.sql
-- ตรวจสอบคอลัมน์ในตาราง deal_commissions

CREATE OR REPLACE FUNCTION public.debug_get_columns(table_name text)
RETURNS TABLE (
    column_name text,
    data_type text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT column_name::text, data_type::text
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1;
$$;

GRANT EXECUTE ON FUNCTION public.debug_get_columns(text) TO anon, authenticated, service_role;

-- เรียกดูคอลัมน์
SELECT * FROM public.debug_get_columns('deal_commissions');
