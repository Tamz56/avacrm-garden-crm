-- RPC: ปิดดีล + หักสต็อก + บันทึก stock_movements
-- ชื่อฟังก์ชัน: close_deal_and_update_stock(p_deal_id uuid)

CREATE OR REPLACE FUNCTION public.close_deal_and_update_stock (
  p_deal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal          public.deals%ROWTYPE;
  v_item          RECORD;
  v_errors        text[] := '{}';
BEGIN
  -- 1) lock deal นี้ไว้กัน race condition
  SELECT *
  INTO v_deal
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal % not found', p_deal_id USING ERRCODE = 'P0002';
  END IF;

  -- 2) กันยิงซ้ำ: ถ้ามี stock_movements ของดีลนี้แล้ว ให้ stop
  IF EXISTS (
    SELECT 1
    FROM public.stock_movements sm
    WHERE sm.related_deal_id = p_deal_id
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'stock_already_finalized',
      'message', 'ดีลนี้ถูกตัดสต็อกไปแล้ว'
    );
  END IF;

  -- 3) ถ้า stage ยังไม่ใช่ won ให้เปลี่ยนเป็น won (optional)
  IF v_deal.stage <> 'won' THEN
    UPDATE public.deals
    SET stage      = 'won',
        status     = COALESCE(status, 'draft'),
        updated_at = NOW()
    WHERE id = p_deal_id;
  END IF;

  -- 4) loop รายการ deal_items ที่ผูกกับ stock_item
  FOR v_item IN
    SELECT
      di.id            AS deal_item_id,
      di.stock_item_id,
      di.quantity      AS deal_quantity,
      si.quantity_available
    FROM public.deal_items di
    JOIN public.stock_items si
      ON di.stock_item_id = si.id
    WHERE di.deal_id = p_deal_id
  LOOP
    -- 4.1) validate ข้อมูล
    IF v_item.stock_item_id IS NULL THEN
      v_errors := array_append(
        v_errors,
        format('รายการ %s ไม่มี stock_item_id', v_item.deal_item_id)
      );
      CONTINUE;
    END IF;

    IF v_item.deal_quantity IS NULL OR v_item.deal_quantity <= 0 THEN
      v_errors := array_append(
        v_errors,
        format('รายการ %s มีจำนวนไม่ถูกต้อง (%s)',
               v_item.deal_item_id, v_item.deal_quantity)
      );
      CONTINUE;
    END IF;

    IF v_item.quantity_available IS NULL
       OR v_item.quantity_available < v_item.deal_quantity THEN
      v_errors := array_append(
        v_errors,
        format('สต็อกไม่พอสำหรับ stock_item %s (คงเหลือ %s ต้องการ %s)',
               v_item.stock_item_id,
               COALESCE(v_item.quantity_available, 0),
               v_item.deal_quantity)
      );
      CONTINUE;
    END IF;

    -- 4.2) update stock_items: หักจำนวนที่ขายออก
    UPDATE public.stock_items
    SET quantity_available = quantity_available - v_item.deal_quantity,
        updated_at         = NOW()
    WHERE id = v_item.stock_item_id;

    -- 4.3) insert stock_movements เป็น OUT
    INSERT INTO public.stock_movements (
      stock_item_id,
      movement_type,
      quantity,
      related_deal_id,
      note
    ) VALUES (
      v_item.stock_item_id,
      'OUT',                            -- ต้องมีค่าตัวนี้ใน enum movement_type
      v_item.deal_quantity,
      p_deal_id,
      format('ขายตามดีล %s', COALESCE(v_deal.deal_code::text, p_deal_id::text))
    );
  END LOOP;

  -- 5) ถ้ามี error ระหว่าง loop ให้คืนค่า ok=false + list errors
  IF array_length(v_errors, 1) IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'validation_error',
      'errors', v_errors
    );
  END IF;

  -- 6) ทุกอย่างผ่านเรียบร้อย
  RETURN jsonb_build_object(
    'ok', true,
    'message', 'ปิดดีลและปรับสต็อกเรียบร้อยแล้ว'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.close_deal_and_update_stock(uuid) TO authenticated;

COMMENT ON FUNCTION public.close_deal_and_update_stock IS 'ปิดดีล (stage=won) + หักสต็อก + บันทึก stock_movements พร้อมกันยิงซ้ำ';
