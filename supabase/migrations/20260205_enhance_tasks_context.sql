-- 1. Add Context Columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS context_type text,
ADD COLUMN IF NOT EXISTS context_id uuid,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- 2. Add Constraints / Indexes
-- Ensure context_type is one of the allowed values or null
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_context_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_context_type_check 
CHECK (context_type IS NULL OR context_type IN ('deal', 'customer', 'zone', 'tag'));

-- Index for fast lookup by context
CREATE INDEX IF NOT EXISTS idx_tasks_context ON public.tasks (context_type, context_id);

-- Index for dashboard sorting/filtering
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status_due ON public.tasks (assigned_to, status, due_date);

-- 3. Update create_task_v1
-- Drop first to allow signature change if needed (though we are adding optional params, safer to replace)
CREATE OR REPLACE FUNCTION public.create_task_v1(
    p_task_type text,
    p_status text,
    p_due_date timestamp with time zone,
    p_notes text,
    p_assigned_to uuid,
    -- New Params
    p_context_type text DEFAULT NULL,
    p_context_id uuid DEFAULT NULL,
    p_source text DEFAULT 'manual'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task_id uuid;
    v_assignee uuid;
BEGIN
    -- context validation
    IF p_context_type IS NOT NULL AND p_context_type NOT IN ('deal', 'customer', 'zone', 'tag') THEN
        RAISE EXCEPTION 'Invalid context_type: %', p_context_type;
    END IF;

    -- Default assignee to current user if null
    v_assignee := p_assigned_to;
    IF v_assignee IS NULL THEN
        v_assignee := auth.uid();
    END IF;

    INSERT INTO public.tasks (
        task_type,
        status,
        due_date,
        notes,
        assigned_to,
        context_type,
        context_id,
        source
    ) VALUES (
        p_task_type,
        coalesce(p_status, 'pending'),
        p_due_date,
        p_notes,
        v_assignee,
        p_context_type,
        p_context_id,
        coalesce(p_source, 'manual')
    )
    RETURNING id INTO v_task_id;

    RETURN v_task_id;
END;
$$;

-- 4. Update get_tasks_v1
-- We must DROP first because return type changes (adding columns)
DROP FUNCTION IF EXISTS public.get_tasks_v1(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.get_tasks_v1(
    p_assigned_to uuid,
    p_status text DEFAULT NULL, -- NULL = all
    p_limit integer DEFAULT 200
)
RETURNS TABLE(
    id uuid,
    task_type text,
    status text,
    due_date timestamp with time zone,
    assigned_to uuid,
    notes text,
    created_at timestamp with time zone,
    -- New columns
    context_type text,
    context_id uuid,
    source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.task_type,
        t.status,
        t.due_date,
        t.assigned_to,
        t.notes,
        t.created_at,
        t.context_type,
        t.context_id,
        t.source
    FROM public.tasks t
    WHERE t.assigned_to = p_assigned_to
      AND (p_status IS NULL OR t.status = p_status)
    ORDER BY 
        -- Bucket logic approximation for sorting: Overdue first, then Today, etc.
        -- We just return standard sort here, frontend handles bucketing.
        -- But good to have primary sort by due_date
        t.due_date ASC NULLS LAST,
        t.created_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_task_v1(text, text, timestamptz, text, uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tasks_v1(uuid, text, integer) TO authenticated;

-- Notify schema reload (optional but good for realtime/schema fetching)
NOTIFY pgrst, 'reload schema';
