-- 1) ลบ Trigger/Function เดิม ถ้ามีชื่อซ้ำ
DROP TRIGGER IF EXISTS trg_tree_tags_set_stock_out ON public.tree_tags;
DROP FUNCTION IF EXISTS public.fn_tree_tags_set_stock_out();

-- 2) สร้างฟังก์ชัน Trigger
CREATE OR REPLACE FUNCTION public.fn_tree_tags_set_stock_out()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
BEGIN
    -- ถ้ายังไม่มี stock_in_date ให้ default เป็นวันที่วันนี้
    IF NEW.stock_in_date IS NULL THEN
        NEW.stock_in_date := CURRENT_DATE;
    END IF;

    -- ถ้า status เปลี่ยนเป็น shipped หรือ planted และยังไม่มี stock_out_date
    IF NEW.status IN ('shipped', 'planted')
       AND (OLD.status IS DISTINCT FROM NEW.status)
       AND NEW.stock_out_date IS NULL THEN
        NEW.stock_out_date := CURRENT_DATE;
    END IF;

    RETURN NEW;
END;
$fn$;

-- 3) ผูก Trigger กับ table
CREATE TRIGGER trg_tree_tags_set_stock_out
BEFORE UPDATE ON public.tree_tags
FOR EACH ROW
EXECUTE FUNCTION public.fn_tree_tags_set_stock_out();
