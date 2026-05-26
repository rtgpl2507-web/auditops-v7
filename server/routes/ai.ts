import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';
import { FrameworkType } from '../../src/types';
import { getFrameworkData } from '../storage';

export const aiRouter = Router();

// ── Groq client factory ───────────────────────────────────────────────────────
function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in .env.local');
  return new Groq({ apiKey });
}

// Helper: single-turn chat completion via Groq
async function groqChat(systemPrompt: string, userPrompt: string, maxTokens = 800): Promise<string> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content?.trim() ?? '';
}

// ── POST /api/ai/suggest ──────────────────────────────────────────────────────
// Body: { framework, controlId }  →  returns { suggestion: string }
aiRouter.post('/suggest', async (req: Request, res: Response) => {
  const { framework, controlId } = req.body as { framework: FrameworkType; controlId: string };

  const data = getFrameworkData(framework);
  const control = data.controls.find(c => c.id === controlId);
  if (!control) return res.status(404).json({ error: 'Control not found' });

  const system = 'You are a senior IT auditor. Write concise, professional auditor remarks for compliance audit reports. Return ONLY the remark text — no preamble, no explanation.';

  const user = `Write a professional auditor remark (2-3 sentences) for this audit control:

Framework: ${framework}
Domain: ${control.domain} > ${control.subDomain}
Control Point: ${control.controlPoint}
Control Description: ${control.controlDescription}
Document Required: ${control.documentRequired}
Current Status: ${control.status}
Evidence Files Attached: ${control.evidence.length}
Existing Clarification: ${control.clarification || 'None'}

Be specific, concise, and reflect the current status and evidence situation.`;

  try {
    const suggestion = await groqChat(system, user, 300);
    res.json({ suggestion });
  } catch (err: any) {
    console.error('Groq suggest error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
// Body: { framework, messages: [{role, content}] }
aiRouter.post('/chat', async (req: Request, res: Response) => {
  const { framework, messages } = req.body as {
    framework: FrameworkType;
    messages: { role: 'user' | 'model'; content: string }[];
  };

  const data = getFrameworkData(framework);
  const totalControls = data.controls.length;
  const byStatus = data.controls.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  const byDomain = data.controls.reduce<Record<string, { total: number; completed: number }>>((acc, c) => {
    if (!acc[c.domain]) acc[c.domain] = { total: 0, completed: 0 };
    acc[c.domain].total++;
    if (c.status === 'Completed') acc[c.domain].completed++;
    return acc;
  }, {});

  const pendingList = data.controls
    .filter(c => c.status === 'Pending From Client')
    .slice(0, 5)
    .map(c => `- ${c.srNo}: ${c.controlPoint.slice(0, 80)}`)
    .join('\n');

  const domainSummary = Object.entries(byDomain)
    .map(([d, v]) => `  ${d}: ${v.completed}/${v.total} completed`)
    .join('\n');

  const systemContext = `You are AuditOps AI, an expert IT governance and compliance assistant embedded in the AuditOps platform. You have access to the current audit data for the ${framework} framework. Be concise, professional, and helpful. Use bullet points where appropriate.

Current Audit State — ${framework}:
Total Controls: ${totalControls}
Status Breakdown: ${JSON.stringify(byStatus)}
Domain Progress:
${domainSummary}
${pendingList ? `\nTop Pending From Client Controls:\n${pendingList}` : ''}`;

  try {
    const client = getClient();

    // Map messages: Groq uses 'assistant' not 'model'
    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemContext },
      ...messages.map(m => ({
        role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      max_tokens: 800,
      temperature: 0.4,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? '';
    res.json({ reply });
  } catch (err: any) {
    console.error('Groq chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/refine ───────────────────────────────────────────────────────
// Body: { text, fieldLabel, context }  →  returns { refined: string }
aiRouter.post('/refine', async (req: Request, res: Response) => {
  const { text, fieldLabel, context } = req.body as {
    text: string;
    fieldLabel: string;
    context?: string;
  };

  if (!text?.trim()) {
    return res.status(400).json({ error: 'No text provided to refine.' });
  }

  const system = 'You are a professional audit report writer. Transform raw input into polished, professional, concise language suitable for a formal audit report. Return ONLY the refined text — no preamble, no explanation, no markdown.';

  const user = `Refine the following raw input for the "${fieldLabel}" field${context ? ` (context: ${context})` : ''}.
Keep the same meaning. Do not add information that was not implied.

Raw input:
"""
${text.trim()}
"""`;

  try {
    const refined = await groqChat(system, user, 400);
    res.json({ refined });
  } catch (err: any) {
    console.error('Groq refine error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/email-template ───────────────────────────────────────────────
// Body: { remark, context }
// Analyses the remark to decide whether it flags an evidence/document issue.
// If YES → returns { isIssue: true,  subject: string, body: string }
// If NO  → returns { isIssue: false, subject: null,   body: null   }
aiRouter.post('/email-template', async (req: Request, res: Response) => {
  const { remark, context } = req.body as {
    remark: string;
    context: {
      type: 'checklist' | 'task';
      framework: string;
      srNo: string;
      title: string;
      domain?: string;
      documentRequired?: string;
      evidenceFiles: string[];
      auditorName: string;
    };
  };

  // Guard: empty remark → no issue
  if (!remark?.trim()) {
    return res.json({ isIssue: false, subject: null, body: null });
  }

  const fileList = context.evidenceFiles.length > 0
    ? context.evidenceFiles.map(f => `  • ${f}`).join('\n')
    : '  (no files attached)';

  const system = `You are an AI assistant in AuditOps, an audit management platform.
Your ONLY job here is to:
1. Decide if the auditor's remark signals a problem with submitted evidence/documents (wrong file, missing doc, incorrect format, unreadable, incomplete, irrelevant, etc.).
2. If YES — produce a professional email template for requesting correct evidence resubmission.
3. If NO  — return { "isIssue": false }.

CRITICAL OUTPUT RULES:
- Respond ONLY with valid JSON.
- Do NOT include markdown fences, backticks, or any text outside the JSON.
- JSON schema: { "isIssue": boolean, "subject": string|null, "body": string|null }`;

  const user = `Analyse this auditor remark and generate an email template if an evidence issue is detected.

CONTEXT:
  Section: ${context.type === 'checklist' ? 'Audit Checklist' : 'Tasks'}
  Framework: ${context.framework}
  Sr No: ${context.srNo}
  ${context.type === 'checklist' ? `Control Point: ${context.title}` : `Task Name: ${context.title}`}
  ${context.domain ? `Domain: ${context.domain}` : ''}
  ${context.documentRequired ? `Document Required: ${context.documentRequired}` : ''}
  Auditor: ${context.auditorName}
  Attached Evidence Files:
${fileList}

AUDITOR'S REMARK:
"${remark.trim()}"

RULES FOR DETECTION:
- Only flag as an issue if the remark CLEARLY implies something is wrong with the evidence or document.
- Do NOT flag general status notes, progress updates, or informational remarks.

EMAIL RULES (only if isIssue is true):
- Address: "Dear Responsible Party"
- Reference Sr No and title specifically.
- Mention the exact problem from the remark.
- Request prompt resubmission of correct evidence.
- Sign off: "${context.auditorName} | AuditOps Platform | ${context.framework} Audit"
- Keep body under 200 words.

Return ONLY valid JSON (no markdown, no backticks):
{ "isIssue": true|false, "subject": "...", "body": "..." }`;

  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
      max_tokens: 600,
      temperature: 0.2,
      // Ask Groq for JSON output
      response_format: { type: 'json_object' },
    });

    let raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
    // Strip any accidental markdown fences just in case
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    const parsed = JSON.parse(raw);
    res.json({
      isIssue: Boolean(parsed.isIssue),
      subject: parsed.subject ?? null,
      body:    parsed.body    ?? null,
    });
  } catch (err: any) {
    console.error('Groq email-template error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/summary ──────────────────────────────────────────────────────
// Body: { framework }  →  returns { summary: string }
aiRouter.post('/summary', async (req: Request, res: Response) => {
  const { framework } = req.body as { framework: FrameworkType };
  const data = getFrameworkData(framework);

  const total      = data.controls.length;
  const completed  = data.controls.filter(c => c.status === 'Completed').length;
  const inProgress = data.controls.filter(c => c.status === 'In Progress').length;
  const pending    = data.controls.filter(c => c.status === 'Pending From Client').length;
  const notStarted = data.controls.filter(c => c.status === 'Not Started').length;

  const domainBreakdown = Object.entries(
    data.controls.reduce<Record<string, { total: number; completed: number; pending: number }>>((acc, c) => {
      if (!acc[c.domain]) acc[c.domain] = { total: 0, completed: 0, pending: 0 };
      acc[c.domain].total++;
      if (c.status === 'Completed') acc[c.domain].completed++;
      if (c.status === 'Pending From Client') acc[c.domain].pending++;
      return acc;
    }, {})
  )
    .map(([d, v]) => `${d}: ${v.completed}/${v.total} completed, ${v.pending} pending client`)
    .join('\n');

  const system = 'You are a senior IT audit manager. Write professional, structured executive summaries for audit status reports.';

  const user = `Write a professional executive summary for the following ${framework} audit status. Include key findings, risk areas, and recommended next steps. Format with clear sections. Keep it under 400 words.

Audit: ${framework} Framework Assessment
Date: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}

Overall Progress: ${completed}/${total} controls completed (${Math.round((completed / total) * 100)}%)
In Progress: ${inProgress}
Pending From Client: ${pending}
Not Started: ${notStarted}

Domain Breakdown:
${domainBreakdown}`;

  try {
    const summary = await groqChat(system, user, 600);
    res.json({ summary });
  } catch (err: any) {
    console.error('Groq summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
