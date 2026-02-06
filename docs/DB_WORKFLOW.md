# Database Workflow

> ⚠️ **CRITICAL**: Never run `supabase db push` blindly. Always verify the target project.

## 1. Development Flow (Local)

1.  Modify SQL files or Schema.
2.  Create a new migration:
    ```bash
    supabase migration new my_change_name
    ```
3.  Edit the migration file in `supabase/migrations`.
4.  Apply to local DB:
    ```bash
    supabase db reset
    # OR
    supabase migration up
    ```

## 2. Pushing to Remote (Staging/Prod)

**DO NOT use `supabase db push` directly.** Use the safe scripts:

### Windows (PowerShell)
```powershell
./scripts/db-push-safe.ps1
```

### Mac / Linux
```bash
./scripts/db-push-safe.sh
```

These scripts will:
1.  Show you the current `project ref`.
2.  Ask for explicit `YES` confirmation.
3.  Run the push command safely.

## 3. Troubleshooting

- If `db push` complains about conflict, verify if someone else pushed a migration.
- Always `git pull` before starting new DB work.
