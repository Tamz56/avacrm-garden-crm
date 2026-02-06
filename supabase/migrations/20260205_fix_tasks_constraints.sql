-- Fix 1: Enforce Canonical Task Types
-- First, update any existing invalid task types to 'general' to prevent constraint violation
UPDATE public.tasks
SET task_type = 'general'
WHERE task_type NOT IN ('follow_up', 'planting_followup', 'site_visit', 'quote', 'delivery', 'payment_followup', 'general');

-- Add the check constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_task_type_check
    CHECK (task_type IN ('follow_up', 'planting_followup', 'site_visit', 'quote', 'delivery', 'payment_followup', 'general'));

-- Fix 2: Ensure context_id is nullable (it should be, but just in case)
ALTER TABLE public.tasks ALTER COLUMN context_id DROP NOT NULL;

-- Fix 3: Update tasks_context_type_check to support 'stock' if needed, OR ensure 'stock' context types are handled.
-- User said: "map task_type ... canonical keys ... context_id uuid ... forbid stock_general as context_id"
-- If we use 'stock' as context_type, we should add it to the check list alongside 'deal', 'customer', 'zone', 'tag'
-- The previous migration had: CHECK (context_type IS NULL OR context_type IN ('deal', 'customer', 'zone', 'tag'))
-- We should probably add 'stock' to allowed context types if we want to track stock tasks,
-- even if context_id is NULL (generic stock task).
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_context_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_context_type_check 
    CHECK (context_type IS NULL OR context_type IN ('deal', 'customer', 'zone', 'tag', 'stock'));

-- Notify reloads
NOTIFY pgrst, 'reload schema';
