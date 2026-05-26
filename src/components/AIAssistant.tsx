import React, { useState, useRef, useEffect } from 'react';
import { useAuditContext } from '../data/AuditContext';
import { sendAIChat, getAuditSummary } from '../services/api';
import { FrameworkType } from '../types';
import { Bot, Send, X, Sparkles, Loader2, FileText, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const QUICK_PROMPTS = [
  'What is the overall audit completion status?',
  'Which domains have the most pending controls?',
  'List all controls pending from client',
  'What are the top risk areas?',
  'Generate a brief audit summary',
];

export function AIAssistant({ onClose }: { onClose: () => void }) {
  const { selectedFramework, frameworkData } = useAuditContext();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: `Hello! I'm your AuditOps AI assistant for **${selectedFramework}**. I have full visibility into your current audit data. Ask me anything — status summaries, risk areas, pending items, or control-specific questions.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || loading || !selectedFramework) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendAIChat(selectedFramework as FrameworkType, newMessages);
      setMessages(prev => [...prev, { role: 'model', content: reply }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'model', content: `⚠️ Error: ${err.message}. Please check your GROQ_API_KEY in .env.local.` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!selectedFramework || summaryLoading) return;
    setSummaryLoading(true);
    try {
      const summary = await getAuditSummary(selectedFramework as FrameworkType);
      setMessages(prev => [
        ...prev,
        { role: 'user', content: 'Generate an executive audit summary.' },
        { role: 'model', content: summary },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'model', content: `⚠️ Error generating summary: ${err.message}` },
      ]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Markdown-lite renderer: bold, bullets, newlines
  const renderContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc pl-4 space-y-1 my-1">$1</ul>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
            <Bot size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold">AuditOps AI</p>
            <p className="text-[10px] text-slate-400">{selectedFramework} Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateSummary}
            disabled={summaryLoading}
            title="Generate Executive Summary"
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md transition-colors disabled:opacity-50"
          >
            {summaryLoading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            Summary
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'model' && (
              <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 mt-1">
                <Sparkles size={12} className="text-blue-600" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[85%] px-3 py-2.5 rounded-xl text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
              )}
              dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
            />
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
              <Sparkles size={12} className="text-blue-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-2 border-t border-slate-100 bg-white">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="shrink-0 text-[11px] px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-full border border-slate-200 hover:border-blue-200 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 bg-white shrink-0">
        <div className="flex gap-2 items-end bg-slate-100 rounded-xl px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about your audit..."
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none max-h-24 leading-relaxed"
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${t.scrollHeight}px`;
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
