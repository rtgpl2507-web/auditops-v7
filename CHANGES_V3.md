# AuditOps v8 – Changes (V3 Modifications)

## Summary
This release adds a **dynamic framework management system** that lets any
authorised user create custom audit frameworks directly from the UI.  All
existing functionality (checklists, tasks, AI assistant, import/export,
evidence upload) is unchanged and works identically for both built-in and
custom frameworks.

---

## 1. New: Framework Registry (backend)

### `server/storage.ts`
- Added `registry.json` at `server/data/registry.json` to persist custom frameworks across restarts.
- `listFrameworks()` – returns all built-in + custom frameworks.
- `registerFramework(name, description)` – validates uniqueness, normalises the ID
  (`"GDPR 2024"` → `"GDPR_2024"`), writes to registry, and seeds an empty
  `FrameworkData` JSON file so the framework is immediately accessible.

### `server/routes/frameworks.ts`
- **`GET  /api/frameworks`** – lists all frameworks (used by the selector page).
- **`POST /api/frameworks`** – creates a new custom framework.
  Validation: name required, max 30 chars, no duplicate IDs, 409 on conflict.

### `server/seedData.ts`
- `generateFrameworkData` no longer throws on unknown framework IDs;
  it returns empty `{ controls:[], tasks:[], activity:[] }` so custom
  frameworks start blank and are populated by the user.

---

## 2. New: FrameworkSelector UI

### `src/components/FrameworkSelector.tsx`  (full rewrite)
- Fetches the framework list dynamically from `GET /api/frameworks` on mount.
- **"Add Framework" button** in the top-right of the page header.
- **Inline Add-Framework form** (no modal, no page redirect):
  - *Name* field – required, max 30 chars, only safe characters (letters,
    digits, spaces, hyphens, underscores), duplicate-name check.
  - *Description* field – optional, max 120 chars.
  - Real-time character counter on the name field.
  - Inline error messages with icons; success banner on the grid.
  - Submitting state with spinner; Cancel button to dismiss.
- Built-in frameworks displayed in a clearly labelled section.
- Custom frameworks displayed in a separate "Custom Frameworks" section
  with colour-coded icons and a "Custom" badge.
- Loading spinner while fetching; error state with Retry button.

---

## 3. Type System

### `src/types.ts`
- `FrameworkType` is now `type FrameworkType = string` (was a fixed union).
- Added `BUILTIN_FRAMEWORKS` tuple and `BuiltinFrameworkId` type for
  places that need to distinguish built-in from custom.
- New `FrameworkEntry` interface `{ id, name, description, isBuiltin }`.

### `src/services/api.ts`
- `listFrameworks()` → `GET /api/frameworks`
- `createFramework(name, description)` → `POST /api/frameworks`

---

## 4. Dependency Fix
- Added `react-is` to `dependencies` (was missing; caused a build error
  with `recharts` via Rollup).

---

## What was NOT changed
- `LoginPage` – unchanged.
- `Portal`, `Dashboard`, `Checklist`, `Tasks` – unchanged.
- `AIAssistant`, `AIRefineButton`, `EvidenceEmailModal` – unchanged.
- `AuthContext`, `AuditContext`, `TaskContext` – unchanged.
- All backend AI, tasks, and evidence routes – unchanged.
