# Connecting AuditOps to Supabase

This adds Supabase as an optional storage backend. Your existing disk-based
storage keeps working exactly as before — Supabase only activates when you
set two environment variables. Nothing is deleted or changed until you
explicitly switch over.

## What changed in the code

- `server/storageDisk.ts` — your original storage logic, unchanged in behavior
- `server/storageSupabase.ts` — new, same functions, backed by Supabase
- `server/storage.ts` — now a switcher: picks disk or Supabase based on env vars
- `server/supabaseClient.ts` — creates the Supabase client
- `server/migrateToSupabase.ts` — one-time script to copy your existing data over
- `supabase/schema.sql` — the database schema to run in Supabase
- Route files (`frameworks.ts`, `tasks.ts`, `ai.ts`) — updated to `await` storage
  calls, since Supabase queries are asynchronous. No endpoint behavior changed.

File uploads (evidence/task documents) still save to local disk in both modes —
only the registry/framework/task JSON data moves to Supabase.

---

## Step 1 — Create the database tables

1. Open your Supabase project dashboard.
2. Go to the **SQL Editor** (left sidebar).
3. Click **New query**.
4. Open `supabase/schema.sql` from this project, copy its entire contents,
   paste into the editor, and click **Run**.
5. Confirm no errors appear. Go to **Table Editor** and check that you now see:
   `frameworks`, `controls`, `evidence_files`, `tasks`, `task_documents`, `activity_log`.

## Step 2 — Get your credentials

1. In the Supabase dashboard, go to **Project Settings** → **API**.
2. Copy the **Project URL** — this is your `SUPABASE_URL`.
3. Copy the **service_role** key (NOT the `anon` key — the service role key
   bypasses Row Level Security, which this backend requires). It's under
   **Project API keys**, marked `service_role`, `secret`.

> The service role key has full database access. Never expose it in frontend
> code or commit it to git. It only belongs in your backend's environment
> variables (`.env.local` locally, or your hosting provider's environment
> variable settings in production).

## Step 3 — Add credentials locally (to test before going live)

Open `.env.local` and uncomment + fill in:

```
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
```

## Step 4 — Migrate your existing data

Before switching the running app over, copy your current disk data into Supabase:

```bash
npm run migrate:supabase
```

This reads `server/data/registry.json` and `server/data/frameworks/*.json` and
upserts everything into the Supabase tables. It's safe to re-run if something
fails partway — it won't create duplicates.

Check the **Table Editor** in Supabase afterward to confirm your frameworks,
controls, and tasks are present with the expected row counts.

## Step 5 — Switch the app over

With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`, start
the server normally:

```bash
npm run server
```

You'll see this in the console confirming the switch:

```
[storage] Using Supabase backend (SUPABASE_URL detected)
```

Test the app — create a framework, add a control, refresh the page. Everything
should behave exactly as before, just reading and writing to Supabase now.

## Step 6 — Deploy

Add the same two environment variables (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`) in your hosting provider's environment variable
settings (e.g. Render → your service → Environment), then redeploy.

> Tip: keep `AUDITOPS_DATA_DIR` (if you set it earlier for the persistent disk
> fix) — it still controls where uploaded evidence files are stored on disk,
> separately from the database.

---

## Rolling back

To go back to disk storage at any time, just remove or blank out
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and restart the server. No code
changes needed — the switcher falls back to disk automatically. Your disk data
files are untouched throughout this entire process, so rollback is always safe.

## Data integrity notes

- The migration script only adds/updates data in Supabase — it never deletes
  or modifies your local disk files.
- `saveFrameworkData` in the Supabase backend replaces a framework's full set
  of controls/tasks on each save (matching the disk version's "save the whole
  object" behavior). This is safe because the frontend always sends the
  complete updated dataset, not partial diffs.
- Row Level Security is enabled on all tables with no public policies — only
  your backend's service role key can read or write. This is intentional;
  the frontend never talks to Supabase directly.
