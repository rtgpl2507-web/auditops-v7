# AuditOps — Modification Documentation

## Summary of Changes

All 7 requested modifications have been implemented. Below is a description of each change and how to access the new features.

---

## 1. CONTROL REFERENCE NO. Field

**Files changed:** `src/types.ts`, `server/seedData.ts`, `server/routes/frameworks.ts`, `src/components/Checklist.tsx`

- Added a new `controlRefNo` field to the `AuditControl` interface in `src/types.ts`.
- The field is automatically generated when framework data is seeded (e.g., `ITGC-REF-001`).
- The field appears as a new **"Control Ref No."** column immediately after **"Sr. No."** in the Audit Checklist table.
- It is also included in the CSV export and the import template.

---

## 2. Remove Task (Cross ✕ Button) Per Checklist Row

**Files changed:** `src/components/Checklist.tsx`, `server/routes/frameworks.ts`, `src/services/api.ts`

- Each row in the Audit Checklist now has a **red ✕ button** in the first column.
- Clicking it shows a confirmation dialog, then permanently removes the task from the checklist.
- Backend: `DELETE /api/frameworks/:framework/controls/:controlId`

---

## 3. No Demo Data on First Open

**Files changed:** `server/seedData.ts`

- All generated controls now start with status **"Not Started"** (no randomized statuses).
- `clarification` and `remarks` fields are empty by default.
- Activity log starts empty (no pre-seeded activity).
- To reset: delete `server/data/` folder and restart the server.

---

## 4. Create Checklist Task Button (ITGC & All Frameworks)

**Files changed:** `src/components/Checklist.tsx`, `server/routes/frameworks.ts`, `src/services/api.ts`

- A **"Create Checklist Task"** button appears in the header of the Audit Checklist for all frameworks.
- Clicking it opens a modal form with all fields: Sr. No., Control Reference No., Domain, Sub-Domain, Control Point, Control Description, Document Required, Status, Clarification, and Auditor Remarks.
- Fields marked with `*` are required.
- Backend: `POST /api/frameworks/:framework/controls`

---

## 5. Login Page — 4 Authorized Users Only

**Files changed:** `src/App.tsx`, `src/data/AuthContext.tsx`, `src/components/LoginPage.tsx`

- The app now requires login before accessing any content.
- No registration option exists.
- **4 authorized users** (credentials stored in `src/data/AuthContext.tsx`):

  | Username   | Password        | Display Name    |
  |------------|-----------------|-----------------|
  | admin      | AuditOps@2024   | Admin User      |
  | auditor1   | Auditor@001     | Lead Auditor    |
  | auditor2   | Auditor@002     | Senior Auditor  |
  | reviewer   | Review@2024     | Audit Reviewer  |

- Session persists until the browser tab is closed or the user clicks **Sign Out** in the sidebar.
- User display name and initials appear in the sidebar and top bar.

---

## 6. Import CSV Button

**Files changed:** `src/components/Checklist.tsx`, `server/routes/frameworks.ts`, `src/services/api.ts`

- An **"Import CSV"** button is now visible next to the Export button in the Audit Checklist header.
- Accepts a CSV file matching the export format (same columns: Sr No, Control Ref No, Domain, Sub-Domain, Control Point, ...).
- If a Sr. No. matches an existing control, it updates that control. Otherwise, it appends a new control.
- After import, the checklist refreshes automatically.
- Backend: `POST /api/frameworks/:framework/import`

---

## 7. Download Report Button (Dashboard)

**Files changed:** `src/components/Dashboard.tsx`

- The Dashboard now shows a **"Download Report"** button next to the progress bar.
- Clicking it opens an HTML print-ready report in a new browser tab and triggers the print dialog automatically.
- The report includes:
  - Framework name, generation date, total controls
  - KPI summary (Completion %, Completed, In Progress, Pending)
  - Stacked progress bar (green/yellow/red/grey)
  - Domain-wise breakdown table
  - Full control listing with status badges
  - Professional AuditOps branding and footer

---

## How to Run

```bash
# Install dependencies (first time)
npm install

# Start both frontend and backend
npm run dev        # frontend (port 3000)
npm run server     # backend (port 3001)
```

Or if a `dev:all` script exists:
```bash
npm run dev:all
```

---

## Notes

- To change authorized users, edit `src/data/AuthContext.tsx` — the `AUTHORIZED_USERS` array.
- Server data persists in `server/data/frameworks/` as JSON files. Delete these to reset a framework to a clean slate.
- The Import CSV format matches the Export CSV format exactly — export first to get the correct template.
