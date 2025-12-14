-- 157_add_shipment_status_and_update_view.sql

-- 1) เพิ่มคอลัมน์สถานะในตาราง deal_shipments
ALTER TABLE public.deal_shipments
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

-- (ถ้าอยากให้บังคับค่าเฉพาะบางสถานะ ใช้ CHECK นี้ได้
--  แต่ถ้ากังวลเรื่อง error สามารถคอมเมนต์บรรทัดนี้ไว้ได้ครับ)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'deal_shipments_status_check'
    ) THEN
        ALTER TABLE public.deal_shipments
        ADD CONSTRAINT deal_shipments_status_check
        CHECK (status IN ('draft', 'completed', 'cancelled'));
    END IF;
END $$;

-- 2) อัปเดต View ให้มีคอลัมน์ status ด้วย
CREATE OR REPLACE VIEW public.view_shipments_with_deal AS
SELECT
    ds.id,
    ds.ship_date,
    ds.deal_id,
    d.title          AS deal_title,
    d.customer_name,
    ds.transporter_name,
    ds.tracking_code,
    ds.distance_km,
    ds.estimated_price,
    ds.final_price,
    ds.status,             -- << เพิ่มสถานะ
    ds.note,
    ds.vehicle_type_id,
    ds.vehicle_code,
    ds.vehicle_name,
    ds.created_at
FROM public.deal_shipments ds
LEFT JOIN public.deals d ON ds.deal_id = d.id;

GRANT SELECT ON public.view_shipments_with_deal TO authenticated;

-- refresh schema
NOTIFY pgrst, 'reload schema';
