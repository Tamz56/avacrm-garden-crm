-- ============================================================
-- 364_normalize_size_label_in_rpc.sql
-- 
-- 1. Function เพื่อ normalize size_label เป็นเลขล้วน
-- 2. Patch RPC create_tree_tag_v2 ให้ใช้ normalize
-- 3. Patch RPC create_tree_tags_batch_v2 ให้ใช้ normalize
-- 4. Constraint digits_only (optional - comment ไว้ก่อน)
-- ============================================================

-- Step 1: Helper function เพื่อ normalize size_label
-- ลบอักขระที่ไม่ใช่ตัวเลข เช่น "5 นิ้ว" -> "5", "3"" -> "3"
create or replace function public.normalize_size_label(raw_label text)
returns text
language plpgsql
immutable
as $$
begin
    -- Remove all non-digit characters except dot for decimals
    return regexp_replace(coalesce(raw_label, ''), '[^0-9.]', '', 'g');
end;
$$;

comment on function public.normalize_size_label(text) is 
'Normalize size_label by removing non-digit characters (e.g. "5 นิ้ว" -> "5")';

-- Step 2: Patch create_tree_tag_v2 เพื่อ normalize size_label
create or replace function public.create_tree_tag_v2(
    p_plot_id uuid,
    p_species_id uuid,
    p_size_label text,
    p_qty integer default 1,
    p_planting_row integer default null,
    p_planting_position integer default null,
    p_status text default 'in_zone',
    p_notes text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_zone_id uuid;
    v_new_id uuid;
    v_normalized_size text;
begin
    -- Normalize size_label
    v_normalized_size := public.normalize_size_label(p_size_label);
    
    -- Get zone_id from plot
    select zone_id into v_zone_id
    from public.planting_plots
    where id = p_plot_id;
    
    if v_zone_id is null then
        raise exception 'Plot ID % not found', p_plot_id;
    end if;
    
    -- Generate new tag
    insert into public.tree_tags (
        zone_id,
        plot_id,
        species_id,
        size_label,
        qty,
        planting_row,
        planting_position,
        status,
        notes
    ) values (
        v_zone_id,
        p_plot_id,
        p_species_id,
        v_normalized_size,  -- ใช้ค่า normalized
        coalesce(p_qty, 1),
        p_planting_row,
        p_planting_position,
        coalesce(p_status, 'in_zone'),
        p_notes
    )
    returning id into v_new_id;
    
    return v_new_id;
end;
$$;

grant execute on function public.create_tree_tag_v2(uuid, uuid, text, integer, integer, integer, text, text) to authenticated;

-- Step 3: Patch create_tree_tags_batch_v2 เพื่อ normalize size_label
create or replace function public.create_tree_tags_batch_v2(
    p_plot_id uuid,
    p_species_id uuid,
    p_size_label text,
    p_qty integer default 1,
    p_planting_row integer default null,
    p_planting_position integer default null,
    p_notes text default null,
    p_tags_count integer default 10
)
returns integer
language plpgsql
security definer
as $$
declare
    v_zone_id uuid;
    v_created_count integer := 0;
    v_normalized_size text;
    i integer;
begin
    -- Normalize size_label
    v_normalized_size := public.normalize_size_label(p_size_label);
    
    -- Get zone_id from plot
    select zone_id into v_zone_id
    from public.planting_plots
    where id = p_plot_id;
    
    if v_zone_id is null then
        raise exception 'Plot ID % not found', p_plot_id;
    end if;
    
    -- Create tags in batch
    for i in 1..coalesce(p_tags_count, 10) loop
        insert into public.tree_tags (
            zone_id,
            plot_id,
            species_id,
            size_label,
            qty,
            planting_row,
            planting_position,
            status,
            notes
        ) values (
            v_zone_id,
            p_plot_id,
            p_species_id,
            v_normalized_size,  -- ใช้ค่า normalized
            coalesce(p_qty, 1),
            p_planting_row,
            null,  -- position will be auto-assigned or null
            'in_zone',
            p_notes
        );
        v_created_count := v_created_count + 1;
    end loop;
    
    return v_created_count;
end;
$$;

grant execute on function public.create_tree_tags_batch_v2(uuid, uuid, text, integer, integer, integer, text, integer) to authenticated;

-- Step 4: Constraint digits_only (OPTIONAL - uncomment ถ้าต้องการ)
-- หมายเหตุ: ก่อน apply ต้อง normalize ข้อมูลเดิมก่อน!
/*
-- Normalize existing data first
UPDATE public.tree_tags 
SET size_label = public.normalize_size_label(size_label)
WHERE size_label IS NOT NULL 
  AND size_label != public.normalize_size_label(size_label);

-- Then add constraint
ALTER TABLE public.tree_tags 
ADD CONSTRAINT chk_tree_tags_size_label_digits_only 
CHECK (size_label IS NULL OR size_label ~ '^[0-9.]*$');
*/

-- ============================================================
-- DONE! 
-- Usage Notes:
-- - "5 นิ้ว" -> "5"
-- - "3"" -> "3"
-- - "6.5 inch" -> "6.5"
-- ============================================================
