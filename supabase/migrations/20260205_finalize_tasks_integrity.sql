-- 1. Enforce Canonical Task Types
-- Update legacy data first (Handles NULLs and Invalid types)
UPDATE public.tasks
SET task_type = 'general'
WHERE task_type IS NULL 
   OR task_type NOT IN ('follow_up', 'planting_followup', 'site_visit', 'quote', 'delivery', 'payment_followup', 'general');

-- Re-apply check constraint
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_task_type_check
    CHECK (task_type IN ('follow_up', 'planting_followup', 'site_visit', 'quote', 'delivery', 'payment_followup', 'general'));

-- 2. Context Constraints
-- Ensure context_id is nullable
ALTER TABLE public.tasks ALTER COLUMN context_id DROP NOT NULL;

-- Ensure context_type allows correct values including 'stock'
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_context_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_context_type_check 
    CHECK (context_type IS NULL OR context_type IN ('deal', 'customer', 'zone', 'tag', 'stock'));

-- 3. Indexes for Navigation
-- Standard compound index (covers general lookups)
CREATE INDEX IF NOT EXISTS idx_tasks_context ON public.tasks (context_type, context_id);

-- Partial index for faster deep link lookups (Optimized for WHERE context_id IS NOT NULL)
CREATE INDEX IF NOT EXISTS idx_tasks_context_notnull
ON public.tasks (context_type, context_id)
WHERE context_id IS NOT NULL;

-- Dashboard sorting index
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status_due ON public.tasks (assigned_to, status, due_date);

-- Reload Schema
NOTIFY pgrst, 'reload schema';
