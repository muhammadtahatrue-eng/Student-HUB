import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { SupabaseConfig } from '../types/index.ts';
import { getSupabaseInstance } from '../lib/supabaseClient.ts';
import { EMAIL_REDIRECT_URL } from './AuthPages.tsx';

interface VerificationBannerProps {
  email: string;
  supabaseConfig?: SupabaseConfig;
  currentTab?: string;
  onNavigateToVerify?: () => void;
}

export const VerificationBanner: React.FC<VerificationBannerProps> = ({
  email,
  supabaseConfig,
  currentTab,
  onNavigateToVerify,
}) => {
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (!email || isResending || cooldown > 0) return;
    setFeedback(null);

    const supabase = supabaseConfig?.isConnected ? getSupabaseInstance(supabaseConfig) : null;
    if (!supabase) {
      setFeedback({
        type: 'error',
        message: 'Supabase authentication service is unavailable.',
      });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: EMAIL_REDIRECT_URL,
        },
      });

      if (error) {
        const lowerMsg = error.message.toLowerCase();
        if (lowerMsg.includes('rate limit') || lowerMsg.includes('security purposes') || error.status === 429) {
          setCooldown(60);
          throw new Error('Please wait a moment before requesting another confirmation email.');
        }
        throw error;
      }

      setCooldown(60);
      setFeedback({
        type: 'success',
        message: `Confirmation link resent to ${email}. Check your inbox and spam folder.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Unable to resend confirmation email right now.',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Email verification required"
      className="relative z-50 w-full bg-amber-950/90 border-b border-amber-500/35 backdrop-blur-md text-amber-100 px-4 py-2.5 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Mail className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-xs sm:text-sm leading-snug">
            <span className="font-semibold text-white">Action Required — Verify your email: </span>
            <span className="text-amber-100/90">
              We sent a verification link to{' '}
              <span className="font-mono font-semibold text-amber-200 underline decoration-amber-400/40">
                {email}
              </span>
              . Please check your inbox (and spam folder) and click the link to unlock profile setup and dashboard access.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={isResending || cooldown > 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 border border-amber-400/35 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            {isResending
              ? 'Sending...'
              : cooldown > 0
              ? `Resend (${cooldown}s)`
              : 'Resend Email'}
          </button>

          {onNavigateToVerify && currentTab !== 'login' && currentTab !== 'signup' && (
            <button
              type="button"
              onClick={onNavigateToVerify}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/35 transition-colors cursor-pointer"
            >
              <span>Verification Screen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2 text-xs">
          <div
            className={`flex items-center gap-2 ${
              feedback.type === 'success' ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-amber-200/70 hover:text-white text-[11px] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
