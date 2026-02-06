-- 404_add_deals_sync_commission_delete_trigger.sql
-- Add AFTER DELETE trigger on public.deals for commission cleanup
-- ============================================================

-- 1) Create AFTER DELETE trigger
-- Function public.sync_deal_commission() already handles DELETE by cleaning up deal_commissions.
-- This trigger ensures that cleanup runs when a deal is deleted.

DROP TRIGGER IF EXISTS deals_sync_commission_delete ON public.deals;

CREATE TRIGGER deals_sync_commission_delete
AFTER DELETE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.sync_deal_commission();

-- Verification SQL:
-- select tgname, pg_get_triggerdef(oid) from pg_trigger 
-- where tgrelid='public.deals'::regclass and not tgisinternal and tgname = 'deals_sync_commission_delete';
