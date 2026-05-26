import React, { useState } from 'react';
import { Mail, X, Copy, CheckCheck, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';

interface EvidenceEmailModalProps {
  subject: string;
  body: string;
  onClose: () => void;
}

/**
 * Modal shown when the AI detects an evidence issue in a remark.
 * Displays the generated email subject + body, with copy-to-clipboard
 * and an "Open in Mail" fallback (mailto: link).
 */
export function EvidenceEmailModal({ subject, body, onClose }: EvidenceEmailModalProps) {
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody]     = useState(false);
  const [copiedAll, setCopiedAll]       = useState(false);

  const copy = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  const mailtoHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Mail size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Evidence Issue — Email Template</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                AI detected an evidence issue in your remark. Use this email to notify the responsible party.
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Alert banner */}
        <div className="mx-6 mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shrink-0">
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            This template was automatically generated based on your remark. Review it before sending — edit the recipient address and adjust any details as needed.
          </p>
        </div>

        {/* Email content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Subject</label>
              <button onClick={() => copy(subject, setCopiedSubject)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
                {copiedSubject ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copiedSubject ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-slate-50 font-medium">
              {subject}
            </div>
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email Body</label>
              <button onClick={() => copy(body, setCopiedBody)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
                {copiedBody ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copiedBody ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              readOnly
              value={body}
              rows={10}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 resize-none focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-b-2xl">
          <button
            onClick={() => copy(`Subject: ${subject}\n\n${body}`, setCopiedAll)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 bg-white rounded-lg hover:bg-slate-50 transition-colors">
            {copiedAll ? <CheckCheck size={15} className="text-emerald-500" /> : <Copy size={15} />}
            {copiedAll ? 'Copied!' : 'Copy All'}
          </button>

          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Dismiss
            </button>
            <a href={mailtoHref}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <ExternalLink size={15} />
              Open in Mail App
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * useEvidenceEmail  — hook that manages the "analyze remark → show modal" flow
 * ───────────────────────────────────────────────────────────────────────────── */
import { useCallback } from 'react';
import { analyzeRemarkForEmail, EmailTemplateContext } from '../services/api';

interface UseEvidenceEmailReturn {
  analyzing: boolean;
  emailSubject: string | null;
  emailBody: string | null;
  showEmailModal: boolean;
  analyzeRemark: (remark: string, ctx: EmailTemplateContext) => Promise<void>;
  closeEmailModal: () => void;
}

export function useEvidenceEmail(): UseEvidenceEmailReturn {
  const [analyzing, setAnalyzing]       = useState(false);
  const [emailSubject, setEmailSubject] = useState<string | null>(null);
  const [emailBody, setEmailBody]       = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const analyzeRemark = useCallback(async (remark: string, ctx: EmailTemplateContext) => {
    if (!remark.trim()) return;
    setAnalyzing(true);
    try {
      const result = await analyzeRemarkForEmail(remark, ctx);
      if (result.isIssue && result.subject && result.body) {
        setEmailSubject(result.subject);
        setEmailBody(result.body);
        setShowEmailModal(true);
      }
      // If not an issue → silently do nothing (no modal, no alert)
    } catch (err: any) {
      // Swallow silently — email generation is enhancement, not critical path
      console.warn('Email template analysis failed:', err.message);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const closeEmailModal = useCallback(() => {
    setShowEmailModal(false);
    setEmailSubject(null);
    setEmailBody(null);
  }, []);

  return { analyzing, emailSubject, emailBody, showEmailModal, analyzeRemark, closeEmailModal };
}
