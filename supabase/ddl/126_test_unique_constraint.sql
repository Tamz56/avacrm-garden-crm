-- Test script for unique constraint
-- Run in Supabase SQL Editor

-- Replace these with actual IDs from your database
-- 1) First insert: should succeed
select public.add_dig_plan_item_v1(
  '2b7bbf37-37f1-4ec6-8c27-e6600964a0ff'::uuid,  -- plan_id
  '9d853259-5370-4ff5-9195-24188676a85d'::uuid,  -- tag_id
  '6"',   -- size_label
  'A',    -- grade
  1,      -- qty
  'test first insert'
);

-- 2) Duplicate insert: should fail with friendly message
-- Expected error: "Tag นี้ถูกเพิ่มในแผนนี้แล้ว"
select public.add_dig_plan_item_v1(
  '2b7bbf37-37f1-4ec6-8c27-e6600964a0ff'::uuid,  -- same plan_id
  '9d853259-5370-4ff5-9195-24188676a85d'::uuid,  -- same tag_id
  '6"',
  'A',
  1,
  'test duplicate'
);

-- 3) Invalid qty: should fail
-- Expected error: "Quantity ต้องมากกว่า 0"
select public.add_dig_plan_item_v1(
  '2b7bbf37-37f1-4ec6-8c27-e6600964a0ff'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '6"',
  'A',
  0,  -- invalid qty
  'test qty zero'
);

-- 4) Non-existent tag: should fail
-- Expected error: "ไม่พบ Tag นี้ในระบบ (tree_tags)"
select public.add_dig_plan_item_v1(
  '2b7bbf37-37f1-4ec6-8c27-e6600964a0ff'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,  -- non-existent tag
  '6"',
  'A',
  1,
  'test invalid tag'
);
