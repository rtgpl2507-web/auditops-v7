# CHANGELOG - AuditOps

## Version 3.1 - Critical Fix (May 14, 2026)

### 🔥 CRITICAL FIX: Infinite Reload Loop Resolved

**Problem:**
- Vite development server was watching `server/data/` directory
- When backend wrote to JSON files (frameworks, tasks), Vite detected file changes
- This triggered automatic page reloads
- Page reloads would load framework data, causing more writes
- Result: Infinite reload loop making the app unusable

**Solution:**
Updated `vite.config.ts` to exclude data directories from file watching:
```typescript
server: {
  watch: {
    ignored: ['**/server/data/**', '**/server/data/uploads/**']
  }
}
```

**Impact:**
- ✅ No more automatic reloads when data changes
- ✅ Framework selection persists across manual refreshes (sessionStorage)
- ✅ All CRUD operations work smoothly without page redirects
- ✅ Application remains stable during active use

### Technical Details

**Files Modified:**
- `vite.config.ts` - Added watch ignore configuration

**How It Works:**
1. Backend writes to JSON files in `server/data/` to persist state
2. Vite's file watcher now ignores these directories
3. Frontend state updates optimistically (immediate UI feedback)
4. API calls sync with backend in background
5. No unnecessary page reloads triggered

**Testing Checklist:**
- [x] Update checklist status - no reload
- [x] Upload evidence files - no reload  
- [x] Add/delete controls - no reload
- [x] Add/delete tasks - no reload
- [x] Import/export CSV - no reload
- [x] Hard refresh (F5) - framework selection persists
- [x] Update remarks/clarifications - no reload

---

## Version 3.0 - Tasks Feature (May 13, 2026)

### ✨ New Features

#### 1. Tasks Management System
- **New Navigation:** "Tasks" menu item added after "Audit Checklist"
- **Full CRUD:** Create, read, update, delete tasks
- **Task Fields:**
  - Sr. No (Serial number for tracking)
  - Task Name (Brief identifier)
  - Task Description (Detailed explanation)
  - Status (Not Started, In Progress, Pending From Client, Completed)
  - Upload Document (File attachments)
  - Remarks (Notes and comments)
- **Delete Option:** X button on each task row with confirmation

#### 2. Import/Export for Tasks
- **Export:** Generate CSV files with all task data
- **Import:** Upload CSV files with validation
- **File Format:** Matches checklist CSV structure
- **Error Handling:** Clear messages for import failures

#### 3. Dashboard Integration
- **Dual Progress:** Separate KPI tracking for checklists and tasks
- **Visual Consistency:** Matching color schemes and chart styles
- **Combined View:** Aggregate progress across both data types

### 🔧 Technical Improvements

**New Components:**
- `src/components/Tasks.tsx` - Complete task management interface

**Updated Components:**
- `src/components/Portal.tsx` - Added Tasks navigation
- `src/components/Dashboard.tsx` - Task progress tracking
- `src/types.ts` - Task interface and types
- `src/services/api.ts` - Task API endpoints
- `src/data/AuditContext.tsx` - Task state management

**Backend Updates:**
- New task routes in `server/routes/frameworks.ts`
- Task storage system in `server/storage.ts`
- Import/export functionality for tasks

### 📝 Files Added
- `src/components/Tasks.tsx`
- `server/data/tasks/` (directory for task JSON files)

### 📝 Files Modified
- `vite.config.ts` ⭐ **CRITICAL FIX**
- `src/types.ts`
- `src/services/api.ts`
- `src/data/AuditContext.tsx`
- `src/components/Portal.tsx`

---

## Known Issues

### Resolved ✅
- ~~Infinite reload loop when making changes~~ **FIXED in v3.1**
- ~~Page redirects to home after modifications~~ **FIXED in v3.1**

### Active
- None currently identified

---

## Installation & Setup

```bash
# Install dependencies
npm install

# Run both frontend and backend
npm run dev:all

# Or run separately:
npm run server  # Backend on port 3001
npm run dev     # Frontend on port 3000
```

## Environment Variables

Create `.env.local` in the root directory:
```
GEMINI_API_KEY=your_api_key_here  # Optional, for AI features
SERVER_PORT=3001                   # Optional, defaults to 3001
```

---

**For Support:** Contact development team
**Last Updated:** May 14, 2026
