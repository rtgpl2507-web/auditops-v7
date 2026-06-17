-- AuditOps Supabase schema
-- Run this once in the Supabase SQL Editor before switching the app over.
-- Mirrors the existing JSON file shapes 1:1 so no data shape changes are needed
-- in the frontend or route handlers.

-- ── Frameworks (built-in + custom registry entries) ──────────────────────────
create table if not exists frameworks (
  id          text primary key,        -- e.g. 'ITGC' or 'GDPR'
  name        text not null,
  description text not null default '',
  is_builtin  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── Controls (the checklist rows inside a framework) ─────────────────────────
create table if not exists controls (
  id                  text primary key,
  framework_id        text not null references frameworks(id) on delete cascade,
  sr_no               text not null,
  control_ref_no      text not null default '',
  domain              text not null default '',
  sub_domain          text not null default '',
  control_point       text not null default '',
  control_description text not null default '',
  document_required   text not null default '',
  status              text not null default 'Not Started',
  clarification       text not null default '',
  remarks             text not null default '',
  updated_at          timestamptz not null default now()
);
create index if not exists idx_controls_framework on controls(framework_id);

-- ── Evidence files attached to a control ──────────────────────────────────────
create table if not exists evidence_files (
  id           text primary key,
  control_id   text not null references controls(id) on delete cascade,
  name         text not null,
  stored_name  text,
  type         text not null default 'bin',
  size         bigint not null default 0,
  uploaded_at  timestamptz not null default now(),
  url          text
);
create index if not exists idx_evidence_control on evidence_files(control_id);

-- ── Tasks (separate from controls, also framework-scoped) ────────────────────
create table if not exists tasks (
  id               text primary key,
  framework_id     text not null references frameworks(id) on delete cascade,
  sr_no            text not null default '',
  task_name        text not null default '',
  task_description text not null default '',
  status           text not null default 'Not Started',
  remarks          text not null default '',
  updated_at       timestamptz not null default now()
);
create index if not exists idx_tasks_framework on tasks(framework_id);

-- ── Task documents (evidence attached to tasks) ───────────────────────────────
create table if not exists task_documents (
  id           text primary key,
  task_id      text not null references tasks(id) on delete cascade,
  name         text not null,
  stored_name  text,
  type         text not null default 'bin',
  size         bigint not null default 0,
  uploaded_at  timestamptz not null default now(),
  url          text
);
create index if not exists idx_taskdocs_task on task_documents(task_id);

-- ── Activity log (per framework) ──────────────────────────────────────────────
create table if not exists activity_log (
  id            text primary key,
  framework_id  text not null references frameworks(id) on delete cascade,
  control_id    text not null default '',
  control_point text not null default '',
  action        text not null,
  user_name     text not null default 'Current User',
  timestamp     timestamptz not null default now()
);
create index if not exists idx_activity_framework on activity_log(framework_id, timestamp desc);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- The Express backend talks to Supabase using the SERVICE ROLE key, which
-- bypasses RLS by design. Enabling RLS here just makes sure that the
-- anon/public key (if ever exposed to the browser) cannot read or write
-- anything directly. No policies are added on purpose — service role
-- access only.
alter table frameworks      enable row level security;
alter table controls        enable row level security;
alter table evidence_files  enable row level security;
alter table tasks           enable row level security;
alter table task_documents  enable row level security;
alter table activity_log    enable row level security;
