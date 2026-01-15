---
description: How to update tree tag status (Normal vs FORCE correction)
---

# Tree Tag Status Update Workflow

## Quick Decision

- **Normal transition** → Use `set_tag_status_v2` or `set_tree_tag_status_v1`
- **Correction / bypass** → Use `force_set_tree_tag_status_v1` (admin + notes required)

---

## Checklist: Normal Status Update

1. Identify tag ID(s) to update
2. Determine target status
3. Call RPC:

```ts
await supabase.rpc("set_tag_status_v2", {
  p_tag_id: tagId,
  p_to_status: "dug",
  p_notes: "optional notes",
  p_source: "ui",
  p_changed_by: null
});
```

4. Verify result in timeline

---

## Checklist: FORCE Correction (Admin Only)

1. Confirm you are logged in as admin
2. Identify tag ID(s) needing correction
3. Prepare reason/notes (required, non-empty)
4. Call FORCE wrapper:

```ts
await supabase.rpc("force_set_tree_tag_status_v1", {
  p_tag_id: tagId,
  p_to_status: "dug_hold",
  p_source: "ui",
  p_notes: "Correction: reason here"
});
```

5. Verify timeline shows `[FORCE]` marker

---

## SQL Editor Testing

// turbo
```sql
-- Simulate admin JWT
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '36ee44ca-1dad-44a4-83dd-43646073f2c2',
    'role', 'authenticated'
  )::text,
  true
);
```

```sql
-- Test FORCE wrapper
SELECT public.force_set_tree_tag_status_v1(
  'TAG_UUID'::uuid,
  'dug_hold'::text,
  'ui'::text,
  'Correction test'::text
);
```

```sql
-- Cleanup
RESET request.jwt.claims;
```

---

## Common Errors

| Error | Solution |
|---|---|
| `Not authenticated` | Set `request.jwt.claims` in SQL Editor or log in via UI |
| `Forbidden: FORCE requires admin` | Use admin account UUID |
| `FORCE requires notes` | Provide non-empty reason |

---

## Related Docs

- [Runbook: Tree Tag Status](../docs/runbook-tree-tag-status.md)
