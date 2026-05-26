import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { refineText } from '../services/api';

interface AIRefineButtonProps {
  /** Current raw value of the field */
  value: string;
  /** Human-readable field label, e.g. "Control Description" */
  fieldLabel: string;
  /** Optional surrounding context string sent to the AI */
  context?: string;
  /** Called with the polished text when AI returns */
  onRefined: (refined: string) => void;
  /** Extra Tailwind classes for positioning */
  className?: string;
}

/**
 * A small "✨ AI Refine" button that sits beside a textarea.
 * On click it sends the current field value to /api/ai/refine and
 * replaces it with the polished result.
 *
 * Shows a spinner while loading, and a subtle green flash on success.
 * If the field is empty it shows a tooltip instead of calling the API.
 */
export function AIRefineButton({
  value,
  fieldLabel,
  context,
  onRefined,
  className = '',
}: AIRefineButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefine = async () => {
    if (!value.trim()) {
      setError('Type something first, then click AI Refine.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const refined = await refineText(value, fieldLabel, context);
      onRefined(refined);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message ?? 'AI Refine failed');
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleRefine}
        disabled={loading}
        title={`AI Refine: polish the "${fieldLabel}" text into professional language`}
        className={[
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 disabled:cursor-not-allowed',
          success
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300',
          loading ? 'opacity-70' : 'opacity-100',
        ].join(' ')}
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Sparkles size={12} className={success ? 'text-emerald-500' : 'text-purple-500'} />
        )}
        {loading ? 'Refining…' : success ? 'Refined ✓' : 'AI Refine'}
      </button>

      {error && (
        <span className="absolute top-full mt-1 right-0 z-50 bg-red-600 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
          {error}
        </span>
      )}
    </div>
  );
}
