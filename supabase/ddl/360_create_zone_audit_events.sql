-- ============================================
-- 360_create_zone_audit_events.sql
-- Zone Audit Event Log for History + Reports (Phase 1)
-- ============================================

-- Table: zone_audit_events
CREATE TABLE IF NOT EXISTS public.zone_audit_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zone_id UUID NOT NULL REFERENCES public.stock_zones(id) ON DELETE CASCADE,

    -- Event classification
    event_type TEXT NOT NULL,
    -- Supported types (extensible):
    --   'inspection'         - from zone_inspection_logs
    --   'maintenance'        - maintenance work done (future)
    --   'checklist_weekly'   - weekly checklist (future)
    --   'checklist_monthly'  - monthly checklist (future)
    --   'health_assessment'  - tree health assessment (future)
    --   'form_score'         - form/defect scoring (future)
    --   'growth_snapshot'    - growth measurement snapshot (future)

    event_date DATE NOT NULL,
    actor_name TEXT,              -- Who performed the action
    notes TEXT,                   -- Summary or description
    payload JSONB,                -- Flexible data storage for event-specific details

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_zone_audit_events_zone_id
    ON public.zone_audit_events(zone_id);

CREATE INDEX IF NOT EXISTS idx_zone_audit_events_event_type
    ON public.zone_audit_events(event_type);

CREATE INDEX IF NOT EXISTS idx_zone_audit_events_event_date
    ON public.zone_audit_events(event_date DESC);

CREATE INDEX IF NOT EXISTS idx_zone_audit_events_zone_date
    ON public.zone_audit_events(zone_id, event_date DESC);

-- RLS
ALTER TABLE public.zone_audit_events ENABLE ROW LEVEL SECURITY;

-- Policies (Phase 1: authenticated only)
DROP POLICY IF EXISTS zone_audit_events_select_policy ON public.zone_audit_events;
DROP POLICY IF EXISTS zone_audit_events_insert_policy ON public.zone_audit_events;

CREATE POLICY zone_audit_events_select_policy
ON public.zone_audit_events
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY zone_audit_events_insert_policy
ON public.zone_audit_events
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grants (Phase 1: no anon)
GRANT SELECT, INSERT ON public.zone_audit_events TO authenticated;
REVOKE ALL ON public.zone_audit_events FROM anon;

-- ============================================
-- View: Recent events per zone (for timeline)
-- ============================================
CREATE OR REPLACE VIEW public.view_zone_audit_events AS
SELECT
    e.id,
    e.zone_id,
    z.name AS zone_name,
    e.event_type,
    e.event_date,
    e.actor_name,
    e.notes,
    e.payload,
    e.created_at
FROM public.zone_audit_events e
JOIN public.stock_zones z ON z.id = e.zone_id
ORDER BY e.event_date DESC, e.created_at DESC;

-- Grants for view (Phase 1: no anon)
GRANT SELECT ON public.view_zone_audit_events TO authenticated;
REVOKE ALL ON public.view_zone_audit_events FROM anon;
