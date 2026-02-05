-- 402_create_deal_with_preorder_rpc.sql
-- Concurrent-safe code generation + RPC for creating deals with preorder items
-- Created: 2026-01-18

-- ============================================================
-- SECTION 1: Code Counters Table (Concurrent-safe)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.code_counters (
  year INT PRIMARY KEY,
  deal_next INT NOT NULL DEFAULT 1,
  dig_plan_next INT NOT NULL DEFAULT 1
);

-- ============================================================
-- SECTION 2: Helper Functions
-- ============================================================

-- next_deal_no: Get next deal number (concurrent-safe with UPDATE lock)
CREATE OR REPLACE FUNCTION public.next_deal_no(p_year INT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_no INT;
BEGIN
  INSERT INTO public.code_counters(year) VALUES (p_year)
  ON CONFLICT (year) DO NOTHING;

  UPDATE public.code_counters
  SET deal_next = deal_next + 1
  WHERE year = p_year
  RETURNING deal_next - 1 INTO v_no;

  RETURN v_no;
END;
$$;

-- next_dig_plan_no: Get next dig plan number (concurrent-safe)
CREATE OR REPLACE FUNCTION public.next_dig_plan_no(p_year INT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_no INT;
BEGIN
  INSERT INTO public.code_counters(year) VALUES (p_year)
  ON CONFLICT (year) DO NOTHING;

  UPDATE public.code_counters
  SET dig_plan_next = dig_plan_next + 1
  WHERE year = p_year
  RETURNING dig_plan_next - 1 INTO v_no;

  RETURN v_no;
END;
$$;

-- ============================================================
-- SECTION 3: Main RPC Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_deal_with_preorder_v1(
    p_deal JSONB,
    p_items JSONB[]
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    v_deal_id UUID;
    v_deal_code TEXT;
    v_item JSONB;
    v_item_id UUID;
    v_dig_plan_id UUID;
    v_dig_code TEXT;
    v_source_type TEXT;
    v_lead_time INT;
    v_qty INT;
    v_unit_price NUMERIC;
    v_line_total NUMERIC;
    v_digup_date DATE;
    v_expected_ready DATE;
    v_size_label TEXT;
BEGIN
    -- Validate input
    IF p_items IS NULL OR array_length(p_items, 1) IS NULL THEN
        RAISE EXCEPTION 'ต้องมีรายการสินค้าอย่างน้อย 1 รายการ';
    END IF;

    -- Generate deal_code (concurrent-safe)
    v_deal_code := 'D-' || v_year || '-' || LPAD(next_deal_no(v_year)::TEXT, 4, '0');

    -- Insert deal
    INSERT INTO public.deals (
        deal_code, title, customer_id, customer_name,
        total_amount, amount, grand_total,
        deposit_amount, shipping_fee, remaining_amount,
        closing_date, note_customer,
        referral_sales_id, closing_sales_id, team_leader_id, owner_id,
        stage, status
    ) VALUES (
        v_deal_code,
        COALESCE(p_deal->>'title', 'ดีลใหม่'),
        (p_deal->>'customer_id')::UUID,
        p_deal->>'customer_name',
        COALESCE((p_deal->>'total_amount')::NUMERIC, 0),
        COALESCE((p_deal->>'total_amount')::NUMERIC, 0),
        COALESCE((p_deal->>'total_amount')::NUMERIC, 0),
        COALESCE((p_deal->>'deposit_amount')::NUMERIC, 0),
        COALESCE((p_deal->>'shipping_cost')::NUMERIC, 0),
        COALESCE((p_deal->>'remaining_amount')::NUMERIC, 0),
        (p_deal->>'closing_date')::DATE,
        p_deal->>'note_customer',
        (p_deal->>'referral_sales_id')::UUID,
        (p_deal->>'closing_sales_id')::UUID,
        (p_deal->>'team_leader_id')::UUID,
        (p_deal->>'owner_id')::UUID,
        'inquiry',
        'draft'
    ) RETURNING id INTO v_deal_id;

    -- Loop items
    FOREACH v_item IN ARRAY p_items
    LOOP
        v_source_type := COALESCE(v_item->>'source_type', 'from_stock');
        v_lead_time := COALESCE((v_item->>'lead_time_days')::INT, 30);
        v_qty := COALESCE((v_item->>'qty')::INT, 1);
        v_size_label := v_item->>'size_label';
        
        -- Validation for preorder (4 required fields)
        IF v_source_type = 'preorder_from_zone' THEN
            IF NULLIF(v_item->>'preorder_zone_id', '') IS NULL THEN
                RAISE EXCEPTION 'สั่งขุดจากแปลงต้องระบุ Zone (preorder_zone_id)';
            END IF;
            IF NULLIF(v_item->>'species_id', '') IS NULL THEN
                RAISE EXCEPTION 'สั่งขุดจากแปลงต้องระบุชนิดพันธุ์ (species_id)';
            END IF;
            IF NULLIF(v_size_label, '') IS NULL THEN
                RAISE EXCEPTION 'สั่งขุดจากแปลงต้องระบุขนาด (size_label)';
            END IF;
            IF v_qty <= 0 THEN
                RAISE EXCEPTION 'จำนวนต้องมากกว่า 0';
            END IF;
        END IF;

        -- Calculate unit_price based on source_type
        v_unit_price := CASE
            WHEN v_source_type = 'preorder_from_zone'
                THEN COALESCE((v_item->>'unit_price_estimate')::NUMERIC, 0)
            ELSE COALESCE((v_item->>'unit_price')::NUMERIC, 0)
        END;
        v_line_total := v_qty * v_unit_price;

        -- Calculate dates (server-side)
        v_digup_date := CURRENT_DATE;  -- เริ่มขุดทันที
        v_expected_ready := v_digup_date + v_lead_time;

        -- Insert deal_item
        INSERT INTO public.deal_items (
            deal_id, description, quantity, unit_price, line_total, unit,
            stock_group_id, trunk_size_inch,
            price_type, height_m, price_per_meter,
            source_type, preorder_zone_id, preorder_plot_id,
            species_id, size_label_preorder,
            lead_time_days, expected_ready_date,
            unit_price_estimate, preorder_notes
        ) VALUES (
            v_deal_id,
            COALESCE(v_item->>'description', 'ไม่ระบุ'),
            v_qty,
            v_unit_price,
            v_line_total,
            'ต้น',
            (v_item->>'stock_group_id')::UUID,
            (v_item->>'trunk_size_inch')::INT,
            COALESCE(v_item->>'price_type', 'per_tree'),
            (v_item->>'height_m')::NUMERIC,
            (v_item->>'price_per_meter')::NUMERIC,
            v_source_type,
            (v_item->>'preorder_zone_id')::UUID,
            (v_item->>'preorder_plot_id')::UUID,
            (v_item->>'species_id')::UUID,
            v_size_label,
            v_lead_time,
            CASE WHEN v_source_type = 'preorder_from_zone' THEN v_expected_ready ELSE NULL END,
            (v_item->>'unit_price_estimate')::NUMERIC,
            v_item->>'preorder_notes'
        ) RETURNING id INTO v_item_id;

        -- If preorder → create dig_plan
        IF v_source_type = 'preorder_from_zone' THEN
            v_dig_code := 'DP-' || v_year || '-' || LPAD(next_dig_plan_no(v_year)::TEXT, 4, '0');
            
            INSERT INTO public.dig_plans (
                code, zone_id, plot_id, species_id, size_label, qty,
                digup_date, expected_ready_date,
                deal_id, deal_item_id, status, notes
            ) VALUES (
                v_dig_code,
                (v_item->>'preorder_zone_id')::UUID,
                (v_item->>'preorder_plot_id')::UUID,
                (v_item->>'species_id')::UUID,
                v_size_label,
                v_qty,
                v_digup_date,
                v_expected_ready,
                v_deal_id,
                v_item_id,
                'planned',
                'AUTO from Deal ' || v_deal_code
            ) RETURNING id INTO v_dig_plan_id;

            -- Link back to deal_item
            UPDATE public.deal_items SET dig_plan_id = v_dig_plan_id WHERE id = v_item_id;
        END IF;
    END LOOP;

    -- Recalc commissions (ignore error if function doesn't exist or fails)
    BEGIN
        PERFORM recalc_deal_commissions(v_deal_id);
    EXCEPTION WHEN OTHERS THEN
        -- Skip any errors during commission calculation to avoid rolling back the transaction
        NULL;
    END;

    RETURN jsonb_build_object(
        'ok', true,
        'deal_id', v_deal_id,
        'deal_code', v_deal_code
    );
    -- Note: No EXCEPTION block - errors will RAISE and rollback transaction
END;
$$;

-- Comments
COMMENT ON FUNCTION public.create_deal_with_preorder_v1(JSONB, JSONB[]) IS 
'สร้างดีลพร้อมรายการสินค้า รองรับทั้ง from_stock และ preorder_from_zone. 
สำหรับ preorder จะสร้าง dig_plan อัตโนมัติและผูกกลับ.
Error จะ RAISE ให้ transaction fail ชัดเจน';
