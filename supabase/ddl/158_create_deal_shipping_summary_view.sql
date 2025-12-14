-- View สรุปจำนวนต้นไม้ในดีล + ที่ส่งแล้ว + เหลือ
CREATE OR REPLACE VIEW public.view_deal_shipping_summary AS
WITH deal_totals AS (
    -- จำนวนต้นรวมในดีล (จากรายการสินค้าในดีล)
    SELECT
        di.deal_id,
        SUM(di.quantity)::numeric AS total_quantity
    FROM public.deal_items di
    GROUP BY di.deal_id
),
deal_shipped AS (
    -- จำนวนต้นที่ส่งออกไปแล้ว (ไม่นับ shipment ที่ถูกยกเลิก)
    SELECT
        ds.deal_id,
        SUM(dsi.quantity)::numeric AS shipped_quantity
    FROM public.deal_shipments ds
    JOIN public.deal_shipment_items dsi
        ON dsi.shipment_id = ds.id
    WHERE ds.status <> 'cancelled'
    GROUP BY ds.deal_id
)
SELECT
    d.id AS deal_id,
    COALESCE(dt.total_quantity, 0) AS total_quantity,
    COALESCE(ds2.shipped_quantity, 0) AS shipped_quantity,
    GREATEST(
        COALESCE(dt.total_quantity, 0) - COALESCE(ds2.shipped_quantity, 0),
        0
    ) AS remaining_quantity,
    (COALESCE(dt.total_quantity, 0) > 0
     AND COALESCE(ds2.shipped_quantity, 0) >= COALESCE(dt.total_quantity, 0)
    ) AS is_fully_shipped
FROM public.deals d
LEFT JOIN deal_totals dt ON dt.deal_id = d.id
LEFT JOIN deal_shipped ds2 ON ds2.deal_id = d.id;

-- สิทธิ์ให้ฝั่ง app ใช้
GRANT SELECT ON public.view_deal_shipping_summary TO authenticated;

-- refresh schema
NOTIFY pgrst, 'reload schema';
