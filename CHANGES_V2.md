# AuditOps v2 — Modification Documentation

## Overview
This document outlines all changes made in version 2 of the AuditOps application.

---

## 1. Tasks Feature (New Sidebar Item)

**Location in app:** Sidebar → "Tasks" (after "Audit Checklist")
**Files added/changed:**
- `src/types.ts` — Added `Task` and `TaskStatus` interfaces
- `src/data/TaskContext.tsx` — New React context for task state management
- `src/components/Tasks.tsx` — Full Tasks UI component
- `server/routes/tasks.ts` — New backend REST routes for tasks
- `server/storage.ts` — Extended to support task persistence
- `server/index.ts` — Registered task router

**Task fields (columns in the table):**
| Field | Type | Notes |
|---|---|---|
| Sr No | Text | Auto-generated (T-001, T-002...) |
| Task Name | Text | Required |
| Task Description | Text | Optional, multi-line |
| Status | Dropdown | Not Started / In Progress / Completed |
| Upload Document | File upload | Multiple files, with view/delete per file |
| Remarks | Textarea | Editable inline |

**Delete:** Each row has a red ✕ button. Confirms before deleting.

---

## 2. Add Task Form (mirrors Add Checklist Task)

**Trigger:** "Add Task" blue button in Tasks header
**Fields in form:** Sr No, Task Name*, Task Description, Status, Remarks
*(asterisk = required)*

After creation, the task appears immediately in the table without page reload.

---

## 3. Import / Export for Tasks

- **Export CSV:** Downloads `{FRAMEWORK}_Tasks.csv` matching the table columns
- **Import CSV:** Accepts a CSV in the same format; updates existing tasks (matched by Sr No) or appends new ones
- Both buttons are in the Tasks page header alongside the Add Task button
- Import format matches export — export first to get a correct template

---

## 4. Dashboard Updated for Tasks

**Files changed:** `src/components/Dashboard.tsx`

The dashboard now shows **two separate progress sections:**

**Checklist Progress:**
- 4 KPI cards: Completion %, Completed, In Progress, Pending From Client
- Checklist progress bar (green / yellow / red)
- Checklist status pie chart

**Task Progress:**
- 3 KPI cards: Task Completion %, Tasks Completed, Tasks In Progress
- Task progress bar (green / blue)
- Task status pie chart

**Download Report:** Updated to include both checklist and task data in one comprehensive PDF report.

---

## 5. Auto-Reload Bug Fix

**Problem:** After updating a control (changing status, editing remarks), the app was redirecting back to the framework selector home page.

**Root cause:** `refreshFramework()` was calling `loadFramework()` which triggered a full state reset, causing `selectedFramework` to appear null momentarily and the `AppContent` component to unmount/remount the entire portal.

**Fix applied in:** `src/data/AuditContext.tsx`

Changes made:
- `updateControl` now uses **optimistic updates only** — state is updated immediately in React without calling `loadFramework()` after success
- On server error, it rolls back by fetching fresh data using `setFrameworkData()` directly (not `loadFramework()`)
- `refreshFramework` uses `setFrameworkData()` directly instead of `loadFramework()`, preventing any side effects on `selectedFramework` state
- All key functions wrapped in `useCallback` with correct dependencies to prevent stale closure issues

---

## 6. Minor Fixes

- Portal's `setActiveTab` wrapped in `useCallback` to prevent unnecessary re-renders
- AI panel auto-closes when switching tabs for cleaner UX
- Dashboard "No activity yet" placeholder added for empty state
- Task uploads served from `/api/uploads/{framework}_tasks/{taskId}/` path
- `server/storage.ts` now ensures backward compatibility: frameworks loaded without a `tasks` field get an empty array automatically
- Duplicate static file route in `server/index.ts` removed

---

## Credential Reference (unchanged from v1)

| Username | Password | Role |
|---|---|---|
| admin | AuditOps@2024 | Admin User |
| auditor1 | Auditor@001 | Lead Auditor |
| auditor2 | Auditor@002 | Senior Auditor |
| reviewer | Review@2024 | Audit Reviewer |

---

## How to Run

```bash
npm install       # first time only
npm run dev       # frontend on port 3000
npm run server    # backend on port 3001
```
