# AuditOps

A full-stack audit management platform with AI-powered features.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure AI (Groq)
```bash
cp .env.example .env.local
```
Edit `.env.local` and add your Groq API key:
```
GROQ_API_KEY=your_key_here
```
Get a free key at: https://console.groq.com

### 3. Run
```bash
# Terminal 1 — Backend (port 3001)
npm run server

# Terminal 2 — Frontend (port 3000)
npm run dev
```

Or run both together:
```bash
npm run dev:all
```

## Login Credentials
| Username | Password | Role |
|---|---|---|
| admin | AuditOps@2024 | Admin User |
| auditor1 | Auditor@001 | Lead Auditor |
| auditor2 | Auditor@002 | Senior Auditor |
| reviewer | Review@2024 | Audit Reviewer |

> ⚠️ Credentials are stored in `src/data/AuthContext.tsx`. Change them there.

## AI Features (all powered by Groq llama-3.3-70b-versatile)

| Feature | How to use |
|---|---|
| **AI Suggest** | Click "✨ AI Suggest" in the Remarks column of any checklist control |
| **AI Refine** | Click "✨ AI Refine" next to any field in the Create Task / Create Checklist forms |
| **AI Email Watch** | Type a remark about an evidence issue (e.g. "wrong file", "document missing") and click away — AI will auto-detect the issue and show an email template |
| **AI Assistant** | Click the AI Assistant button in the sidebar or top bar |

## Evidence Issue Email Feature

When you type a remark in the **Remarks** field of any Checklist control or Task, the AI automatically analyses it when you click away (blur). If the remark indicates a problem with submitted evidence or documents, a modal appears with:
- A professional email subject line
- A ready-to-send email body referencing the specific control/task
- Copy buttons (subject, body, or both)
- "Open in Mail App" button

Remarks that are **not** about evidence issues (e.g. general status notes) are silently ignored.
