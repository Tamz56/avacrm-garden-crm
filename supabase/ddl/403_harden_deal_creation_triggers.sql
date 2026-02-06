-- 403_harden_deal_creation_triggers.sql
-- Harden deal creation triggers (non-blocking + do not overwrite RPC-provided deal_code)
-- ============================================================

-- 1) generate_deal_code(): guard ไม่เขียนทับของเดิม
create or replace function public.generate_deal_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from now())::int;
  v_no   int;
begin
  -- ✅ Guard: ถ้ามี deal_code มาแล้ว (เช่น RPC สร้าง D-2026-0002) อย่าไปทับ
  if new.deal_code is not null and btrim(new.deal_code) <> '' then
    return new;
  end if;

  -- Legacy format: DEAL-YYYY-XXX (3 digits)
  -- ใช้ next_deal_no(year) (concurrent-safe)
  begin
    v_no := public.next_deal_no(v_year);
    new.deal_code := 'DEAL-' || v_year::text || '-' || lpad(v_no::text, 3, '0');
  exception
    when undefined_function then
      -- fallback ถ้าไม่มี next_deal_no (ไม่ควรเกิดในระบบปกติ)
      new.deal_code := 'DEAL-' || v_year::text || '-001';
    when others then
      -- ไม่ให้บล็อคการสร้างดีล
      raise notice 'generate_deal_code failed: %', sqlerrm;
      new.deal_code := coalesce(new.deal_code, 'DEAL-' || v_year::text || '-001');
  end;

  return new;
end;
$$;

-- 2) sync_deal_commission(): non-blocking (INSERT/UPDATE/DELETE)
create or replace function public.sync_deal_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    begin
      -- ล้างข้อมูลคอมมิชชั่นตาม deal_id
      delete from public.deal_commissions where deal_id = old.id;
    exception when others then
      -- log ไว้ แต่ไม่ rollback
      raise notice 'sync_deal_commission DELETE failed for deal %: %', old.id, sqlerrm;
    end;

    return old;
  end if;

  -- INSERT / UPDATE
  begin
    -- เรียกคำนวณ/ซิงก์ค่าคอมฯ
    -- ถ้าไม่มีฟังก์ชันนี้ หรือมัน throw error (เช่น "No config found") ก็ไม่ให้บล็อคดีล
    perform public.recalc_deal_commissions(new.id);

  exception
    when undefined_function then
      -- ไม่มีฟังก์ชันก็ข้ามไป
      null;
    when others then
      -- ✅ log ไว้ แต่ไม่ rollback ดีล
      raise notice 'recalc_deal_commissions failed for deal %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- 3) Rebind triggers on public.deals (Idempotent)
-- ใช้ DROP TRIGGER IF EXISTS ให้ตรงชื่อจริง เพื่อป้องกัน trigger ซ้ำซ้อน
do $$
begin
  -- trigger_generate_deal_code (BEFORE INSERT)
  if exists (
    select 1 from pg_trigger 
    where tgname = 'trigger_generate_deal_code' 
      and tgrelid = 'public.deals'::regclass
  ) then
    drop trigger trigger_generate_deal_code on public.deals;
  end if;

  create trigger trigger_generate_deal_code
  before insert on public.deals
  for each row
  execute function public.generate_deal_code();

  -- deals_sync_commission (AFTER INSERT/UPDATE OF specific columns)
  if exists (
    select 1 from pg_trigger 
    where tgname = 'deals_sync_commission' 
      and tgrelid = 'public.deals'::regclass
  ) then
    drop trigger deals_sync_commission on public.deals;
  end if;

  create trigger deals_sync_commission
  after insert or update of stage, total_amount, owner_id on public.deals
  for each row
  execute function public.sync_deal_commission();
end $$;

-- 4) Verification SQL queries (For reference)
/*
-- 4.1) ตรวจสอบ Trigger Definition
select t.tgname, pg_get_triggerdef(t.oid) as def
from pg_trigger t
where t.tgrelid='public.deals'::regclass
  and not t.tgisinternal
order by 1;

-- 4.2) ตรวจสอบ Function Definition
select pg_get_functiondef('public.generate_deal_code()'::regprocedure);
select pg_get_functiondef('public.sync_deal_commission()'::regprocedure);

-- 4.3) ทดสอบ recalc_deal_commissions แบบ safe
do $$
declare v_id uuid := (select id from public.deals limit 1);
begin
  if v_id is not null then
    begin
      perform public.recalc_deal_commissions(v_id);
    exception when others then
      raise notice 'safe recalc failed: %', sqlerrm;
    end;
  end if;
end $$;
*/
