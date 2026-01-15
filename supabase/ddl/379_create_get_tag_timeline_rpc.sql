-- 379_create_get_tag_timeline_rpc.sql
-- RPC to fetch tag timeline with computed is_correction field
-- Synced with Production definition

create or replace function public.get_tag_timeline_v1(
  p_tag_id uuid,
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  event_id text,
  tag_id uuid,
  event_type text,
  event_at timestamptz,
  from_status text,
  to_status text,
  actor_user_id uuid,
  source text,
  context_type text,
  context_id uuid,
  notes text,
  is_correction boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    'statuslog:' || l.id::text as event_id,
    l.tag_id,
    'status_change'::text as event_type,
    l.changed_at as event_at,
    l.from_status,
    l.to_status,
    l.changed_by as actor_user_id,
    l.source,
    null::text as context_type,
    null::uuid as context_id,
    l.notes,
    -- Compute is_correction from notes containing [FORCE]
    (coalesce(l.notes, '') ilike '%[FORCE]%') as is_correction
  from public.tree_tag_status_logs l
  where l.tag_id = p_tag_id
  order by l.changed_at desc
  limit p_limit
  offset p_offset;
$$;

