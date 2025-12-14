-- 344_add_tree_tags_status_constraint.sql
-- Add CHECK constraint for tree_tags.status with all workflow statuses

-- 1) Drop existing constraint if any (safe to run multiple times)
ALTER TABLE public.tree_tags
DROP CONSTRAINT IF EXISTS tree_tags_status_check;

-- 2) Add CHECK constraint with all valid statuses
ALTER TABLE public.tree_tags
ADD CONSTRAINT tree_tags_status_check CHECK (
    status IN (
        -- In Zone / Available
        'in_zone',              -- อยู่ในแปลง (default)
        'selected_for_dig',     -- เลือกไว้จะขุด
        
        -- Root Pruning Stages
        'root_prune_1',         -- ตัดราก ครั้งที่ 1
        'root_prune_2',         -- ตัดราก ครั้งที่ 2
        'root_prune_3',         -- ตัดราก ครั้งที่ 3
        'root_prune_4',         -- ตัดราก ครั้งที่ 4
        
        -- Ready to Sell
        'ready_to_lift',        -- พร้อมยก/พร้อมขาย (ตัดรากครบแล้ว)
        
        -- Sales / Delivery Pipeline
        'reserved',             -- จองแล้ว (ผูกกับ Deal)
        'dig_ordered',          -- อยู่ในใบสั่งขุด
        'dug',                  -- ขุดแล้ว
        'shipped',              -- จัดส่งแล้ว
        'planted',              -- ปลูกแล้ว (ที่ลูกค้า)
        
        -- Other
        'rehab',                -- พักฟื้น
        'dead',                 -- ตาย
        'cancelled'             -- ยกเลิก
    )
);

-- 3) Comment on the status column for documentation
COMMENT ON COLUMN public.tree_tags.status IS 
'Lifecycle status: in_zone, selected_for_dig, root_prune_1-4, ready_to_lift, reserved, dig_ordered, dug, shipped, planted, rehab, dead, cancelled';
