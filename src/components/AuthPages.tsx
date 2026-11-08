import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  User as UserIcon,
  AtSign,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { StudentUser, SupabaseConfig } from '../types/index.ts';
import { getSupabaseInstance } from '../lib/supabaseClient.ts';
import {
  validateDisplayName,
  validateUsernameFormat,
  validateEmailFormat,
  validatePasswordStrength,
  checkUsernameAvailability,
  fetchAuthenticatedUserProfile,
  saveSetupDraft,
  savePendingSignupDraft
} from '../lib/profileService.ts';

export type AuthPageMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

/**
 * Production root URL for Supabase email confirmation redirects.
 * Must NOT contain a #hash fragment so Supabase can cleanly append callback tokens/codes.
 */
export const EMAIL_REDIRECT_URL =
  typeof window !== 'undefined' && window.location?.origin
    ? `${window.location.origin}/`
    : '/';

export interface AuthCallbackBanner {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface AuthPagesProps {
  mode: AuthPageMode;
  onChangeMode: (mode: AuthPageMode) => void;
  supabaseConfig: SupabaseConfig;
  onAuthenticated: (user: StudentUser, isNewSignup?: boolean) => void;
  onBackToHome: () => void;
  onOpenBackendConfig?: () => void;
  initialVerificationPendingEmail?: string | null;
  onVerificationPendingChange?: (email: string | null) => void;
  externalBannerMessage?: AuthCallbackBanner | null;
  onClearExternalBanner?: () => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({
  mode,
  onChangeMode,
  supabaseConfig,
  onAuthenticated,
  onBackToHome,
  onOpenBackendConfig,
  initialVerificationPendingEmail,
  onVerificationPendingChange,
  externalBannerMessage,
  onClearExternalBanner
}) => {
  // Signup / Login form state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Show/hide password controls
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission & validation feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(
    initialVerificationPendingEmail || null
  );

  // Resend confirmation email state
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccessMsg, setResendSuccessMsg] = useState<string | null>(null);
  const [resendErrorMsg, setResendErrorMsg] = useState<string | null>(null);

  // Live username availability state on signup
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameHint, setUsernameHint] = useState<string | null>(null);

  // Sync external verification-pending email (e.g. when unverified session is detected)
  useEffect(() => {
    if (initialVerificationPendingEmail) {
      setVerificationPendingEmail(initialVerificationPendingEmail);
    }
  }, [initialVerificationPendingEmail]);

  // Countdown timer for resend email cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Clear messages when switching modes
  useEffect(() => {
    setErrorMsg(null);
    setInfoMsg(null);
    setResendSuccessMsg(null);
    setResendErrorMsg(null);
    if (!initialVerificationPendingEmail) {
      setVerificationPendingEmail(null);
    }
  }, [mode, initialVerificationPendingEmail]);

  // Debounced username format + availability check during signup
  useEffect(() => {
    if (mode !== 'signup') return;
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setUsernameAvailable(null);
      setUsernameHint(null);
      return;
    }

    const formatRes = validateUsernameFormat(trimmed);
    if (!formatRes.valid) {
      setUsernameAvailable(false);
      setUsernameHint(formatRes.error || 'Invalid username format.');
      return;
    }

    const supabase = getSupabaseInstance(supabaseConfig);
    if (!supabase) {
      setUsernameAvailable(true);
      setUsernameHint('Username format is valid.');
      return;
    }

    let cancelled = false;
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailability(supabase, trimmed);
      if (cancelled) return;
      setCheckingUsername(false);
      setUsernameAvailable(res.available);
      setUsernameHint(
        res.available ? `@${trimmed} is available` : res.error || `@${trimmed} is already taken`
      );
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, mode, supabaseConfig]);

  const getPasswordResetRedirectUrl = () => {
    return EMAIL_REDIRECT_URL;
  };

  // ============================================================================
  // RESEND CONFIRMATION EMAIL HANDLER
  // ============================================================================
  const handleResendVerification = async () => {
    const targetEmail = (verificationPendingEmail || email).trim().toLowerCase();
    if (!targetEmail || isResending || resendCooldown > 0) return;

    setResendErrorMsg(null);
    setResendSuccessMsg(null);

    const supabase = getSupabaseInstance(supabaseConfig);
    if (!supabase) {
      setResendErrorMsg('Authentication service is not configured yet.');
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: EMAIL_REDIRECT_URL
        }
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (
          error.status === 429 ||
          lower.includes('rate limit') ||
          lower.includes('security purposes') ||
          lower.includes('only request this once') ||
          lower.includes('too many requests')
        ) {
          setResendErrorMsg(
            'Please wait a moment before requesting another confirmation email (rate limit reached).'
          );
          setResendCooldown(60);
        } else {
          setResendErrorMsg(error.message);
        }
      } else {
        setResendSuccessMsg(
          `A fresh verification link has been sent to ${targetEmail}. Please check your inbox and spam folder.`
        );
        setResendCooldown(60);
      }
    } catch (err: any) {
      setResendErrorMsg(
        err?.message || 'Failed to resend confirmation email. Please check your connection.'
      );
    } finally {
      setIsResending(false);
    }
  };

  // ============================================================================
  // SIGNUP HANDLER
  // ============================================================================
  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    setInfoMsg(null);
    setResendErrorMsg(null);
    setResendSuccessMsg(null);
    onClearExternalBanner?.();

    const formEl = e.currentTarget;
    const domDisplayName =
      (formEl.elements.namedItem('displayName') as HTMLInputElement | null)?.value ?? '';
    const domUsername =
      (formEl.elements.namedItem('username') as HTMLInputElement | null)?.value ?? '';
    const domEmail =
      (formEl.elements.namedItem('email') as HTMLInputElement | null)?.value ?? '';
    const domPassword =
      (formEl.elements.namedItem('password') as HTMLInputElement | null)?.value ?? '';
    const domConfirmPassword =
      (formEl.elements.namedItem('confirmPassword') as HTMLInputElement | null)?.value ?? '';

    const rawDisplayName = (displayName || domDisplayName).trim();
    const rawUsername = (username || domUsername).trim().toLowerCase().replace(/\s+/g, '');
    const rawEmail = (email || domEmail).trim().toLowerCase();
    const rawPassword = password || domPassword;
    const rawConfirmPassword = confirmPassword || domConfirmPassword;

    if (rawDisplayName !== displayName) setDisplayName(rawDisplayName);
    if (rawUsername !== username) setUsername(rawUsername);
    if (rawEmail !== email) setEmail(rawEmail);

    // 1. Validate required fields
    const nameCheck = validateDisplayName(rawDisplayName);
    if (!nameCheck.valid) {
      setErrorMsg(nameCheck.error || 'Display name is required.');
      return;
    }

    const cleanUsername = rawUsername;
    const userCheck = validateUsernameFormat(cleanUsername);
    if (!userCheck.valid) {
      setErrorMsg(userCheck.error || 'Valid username is required.');
      return;
    }

    const emailCheck = validateEmailFormat(rawEmail);
    if (!emailCheck.valid) {
      setErrorMsg(emailCheck.error || 'Valid email address is required.');
      return;
    }

    const passCheck = validatePasswordStrength(rawPassword);
    if (!passCheck.valid) {
      setErrorMsg(passCheck.error || 'Password must be at least 8 characters.');
      return;
    }

    if (rawPassword !== rawConfirmPassword) {
      setErrorMsg('Passwords do not match. Please confirm your password.');
      return;
    }

    const supabase = getSupabaseInstance(supabaseConfig);
    if (!supabase) {
      setErrorMsg(
        'Authentication service is not configured yet. Please configure your project URL and Anon Key to create an account.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Verify username uniqueness before creating auth account
      const availability = await checkUsernameAvailability(supabase, cleanUsername);
      if (!availability.available) {
        setErrorMsg(availability.error || `The username "@${cleanUsername}" is already taken.`);
        setIsSubmitting(false);
        return;
      }

      // 3. Save pending signup draft before calling signUp so onAuthStateChange always has Display Name & Username
      const cleanEmail = rawEmail;
      const cleanName = rawDisplayName;
      savePendingSignupDraft(cleanEmail, {
        displayName: cleanName,
        username: cleanUsername
      });

      // 4. Create account with Supabase Auth pointing to the production root URL (no hash fragment)
      let { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: rawPassword,
        options: {
          emailRedirectTo: EMAIL_REDIRECT_URL,
          data: {
            name: cleanName,
            display_name: cleanName,
            full_name: cleanName,
            username: cleanUsername,
            setup_completed: false
          }
        }
      });

      // Fallback if a custom database trigger in Supabase failed on user_metadata columns
      if (error && error.message.toLowerCase().includes('database error')) {
        const retryRes = await supabase.auth.signUp({
          email: cleanEmail,
          password: rawPassword,
          options: {
            emailRedirectTo: EMAIL_REDIRECT_URL
          }
        });
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error) {
        const lowerMsg = error.message.toLowerCase();
        if (lowerMsg.includes('already registered') || lowerMsg.includes('already exists')) {
          setErrorMsg('An account with this email address already exists. Please log in instead.');
        } else {
          setErrorMsg(error.message);
        }
        setIsSubmitting(false);
        return;
      }

      // Supabase returns an obfuscated user with empty identities array when email is already registered and email enumeration protection is active
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setErrorMsg('An account with this email address is already registered. Please log in.');
        setIsSubmitting(false);
        return;
      }

      if (!data.user) {
        setErrorMsg('Account creation could not be completed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Save initial setup draft so Profile Setup is prefilled with Display Name & Username after verification
      saveSetupDraft(data.user.id, {
        displayName: cleanName,
        username: cleanUsername
      });

      const isEmailConfirmed = Boolean(data.user.email_confirmed_at);

      // Only authenticate immediately if the email is genuinely confirmed
      if (data.session && isEmailConfirmed) {
        await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              username: cleanUsername,
              display_name: cleanName,
              setup_completed: false
            },
            { onConflict: 'id' }
          )
          .then(() => {}, () => {});

        const hydratedUser = await fetchAuthenticatedUserProfile(supabase, data.user);
        hydratedUser.name = cleanName;
        hydratedUser.username = cleanUsername;
        hydratedUser.emailConfirmed = true;
        hydratedUser.emailConfirmedAt = data.user.email_confirmed_at || null;
        hydratedUser.setupCompleted = false;
        setIsSubmitting(false);
        onAuthenticated(hydratedUser, true);
        return;
      }

      // If Supabase returned a session even though email_confirmed_at is still null, sign out so unverified users cannot bypass verification
      if (data.session && !isEmailConfirmed) {
        await supabase.auth.signOut().catch(() => {});
        try {
          localStorage.removeItem('studyvault_active_user');
        } catch {}
      }

      // Keep unverified user on the verification-pending screen
      setVerificationPendingEmail(cleanEmail);
      onVerificationPendingChange?.(cleanEmail);
      setPassword('');
      setConfirmPassword('');
      setIsSubmitting(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'A network error occurred while creating your account.');
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // LOGIN HANDLER
  // ============================================================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    setInfoMsg(null);
    setResendErrorMsg(null);
    setResendSuccessMsg(null);
    onClearExternalBanner?.();

    const cleanEmail = email.trim().toLowerCase();
    const emailCheck = validateEmailFormat(cleanEmail);
    if (!emailCheck.valid) {
      setErrorMsg(emailCheck.error || 'Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    const supabase = getSupabaseInstance(supabaseConfig);
    if (!supabase) {
      setErrorMsg(
        'Authentication service is not configured yet. Please configure your project URL and Anon Key to log in.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes('invalid login credentials')) {
          setErrorMsg(
            'Invalid email address or password. Please check your credentials and try again.'
          );
        } else if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
          setVerificationPendingEmail(cleanEmail);
          onVerificationPendingChange?.(cleanEmail);
          setResendErrorMsg(
            'Your email address has not been verified yet. Please open the confirmation link sent to your email or resend a new link below.'
          );
          setPassword('');
        } else {
          setErrorMsg(error.message);
        }
        setIsSubmitting(false);
        return;
      }

      if (!data.user || !data.session) {
        setErrorMsg('Unable to establish an authenticated session. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Strictly enforce email_confirmed_at check even if Supabase returned a session
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut().catch(() => {});
        try {
          localStorage.removeItem('studyvault_active_user');
        } catch {}
        setVerificationPendingEmail(cleanEmail);
        onVerificationPendingChange?.(cleanEmail);
        setResendErrorMsg(
          'Please verify your email address before signing in. Check your inbox for the confirmation link or resend it below.'
        );
        setPassword('');
        setIsSubmitting(false);
        return;
      }

      setVerificationPendingEmail(null);
      onVerificationPendingChange?.(null);
      const hydratedUser = await fetchAuthenticatedUserProfile(supabase, data.user);
      setIsSubmitting(false);
      onAuthenticated(hydratedUser, false);
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Network failure while signing in. Please check your connection.'
      );
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // PASSWORD RECOVERY REQUEST HANDLER
  // ============================================================================
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    setInfoMsg(null);

    const emailCheck = validateEmailFormat(email);
    if (!emailCheck.valid) {
      setErrorMsg(emailCheck.error || 'Please enter a valid email address.');
      return;
    }

    const supabase = getSupabaseInstance(supabaseConfig);
    if (!supabase) {
      setErrorMsg('Authentication service is not configured yet.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: getPasswordResetRedirectUrl()
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setInfoMsg(
          'Password recovery instructions have been sent to your email address. Open the link in your email to set a new password.'
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send password recovery email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // SET NEW PASSWORD HANDLER (Recovery Flow)
  // ============================================================================
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    setInfoMsg(null);

    const passCheck = validatePasswordStrength(password);
    if (!passCheck.valid) {
      setErrorMsg(passCheck.error || 'Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const supabase = getSupabaseInstance(supabaseConfig);
    if (!supabase) {
      setErrorMsg('Authentication service is not configured.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password
      });

      if (error) {
        setErrorMsg(error.message);
        setIsSubmitting(false);
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setInfoMsg('Your password has been updated. Redirecting...');

      if (data.user && data.user.email_confirmed_at) {
        const hydratedUser = await fetchAuthenticatedUserProfile(supabase, data.user);
        setTimeout(() => {
          onAuthenticated(hydratedUser, false);
        }, 900);
      } else {
        setTimeout(() => {
          onChangeMode('login');
        }, 900);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 py-10 sm:py-16 font-outfit">
      <div className="w-full max-w-md">
        {/* Top Back to Xeusar Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Xeusar</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-black" />
            </div>
            <span className="text-sm font-bold tracking-tight uppercase text-white">
              Xeusar
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-[#080a0f]/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          {/* External Callback Feedback Banner (e.g. Expired / Invalid Verification Link or Confirmation Success) */}
          {externalBannerMessage && (
            <div
              role={externalBannerMessage.type === 'error' ? 'alert' : 'status'}
              className={`mb-5 p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                externalBannerMessage.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : externalBannerMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
              }`}
            >
              {externalBannerMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">{externalBannerMessage.text}</div>
            </div>
          )}

          {/* Email Verification Pending View */}
          {verificationPendingEmail ? (
            <div className="text-center space-y-5 py-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mx-auto text-cyan-300">
                <Mail className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-300 text-[10px] font-mono uppercase tracking-wider">
                  <span>Email Verification Required</span>
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Verify Your Email Address
                </h1>
                <p className="text-xs text-white/65 leading-relaxed">
                  We sent a confirmation link to{' '}
                  <span className="text-cyan-300 font-mono font-semibold break-all">
                    {verificationPendingEmail}
                  </span>
                  . Click the confirmation link in your email to verify your account and continue to Profile Setup.
                </p>
              </div>

              {resendErrorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2 text-left"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{resendErrorMsg}</span>
                </div>
              )}

              {resendSuccessMsg && (
                <div
                  role="status"
                  className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2 text-left"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{resendSuccessMsg}</span>
                </div>
              )}

              <div className="pt-1 space-y-2.5">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full py-3 px-5 rounded-xl bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Confirmation Email...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Available in {resendCooldown}s</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Confirmation Email</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerificationPendingEmail(null);
                    onVerificationPendingChange?.(null);
                    setResendErrorMsg(null);
                    setResendSuccessMsg(null);
                    onChangeMode('login');
                  }}
                  className="w-full py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Back to Log In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/25 text-cyan-300 text-[10px] font-mono uppercase tracking-wider mb-3">
                  <ShieldCheck className="w-3 h-3" />
                  <span>
                    {mode === 'signup'
                      ? 'Xeusar Account Registration'
                      : mode === 'login'
                      ? 'Xeusar Account Access'
                      : mode === 'forgot-password'
                      ? 'Password Recovery'
                      : 'Set New Password'}
                  </span>
                </div>

                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {mode === 'signup'
                    ? 'Create your Xeusar account'
                    : mode === 'login'
                    ? 'Log in to Xeusar'
                    : mode === 'forgot-password'
                    ? 'Reset your password'
                    : 'Choose a new password'}
                </h1>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  {mode === 'signup'
                    ? 'Enter your credentials below. After verifying your email address, you will complete your student profile.'
                    : mode === 'login'
                    ? 'Sign in with your verified email and password to access your academic workspace.'
                    : mode === 'forgot-password'
                    ? 'Enter the email address associated with your Xeusar account to receive a recovery link.'
                    : 'Enter and confirm your new password below.'}
                </p>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div
                  role="alert"
                  className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="leading-relaxed">{errorMsg}</p>
                    {!supabaseConfig.isConnected && onOpenBackendConfig && (
                      <button
                        type="button"
                        onClick={onOpenBackendConfig}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        <span>Configure Connection</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Success / Info Alert */}
              {infoMsg && (
                <div
                  role="status"
                  className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{infoMsg}</span>
                </div>
              )}

              {/* ============================================================
                  1. CUSTOM XEUSAR SIGNUP PAGE FORM
                  ============================================================ */}
              {mode === 'signup' && (
                <form onSubmit={handleSignupSubmit} className="space-y-4" noValidate>
                  {/* Display Name */}
                  <div>
                    <label
                      htmlFor="xeusar-signup-display-name"
                      className="block text-xs font-semibold text-white/85 mb-1.5"
                    >
                      Display Name <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="xeusar-signup-display-name"
                        name="displayName"
                        type="text"
                        required
                        maxLength={100}
                        autoComplete="name"
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        onInput={(e) => {
                          setDisplayName((e.target as HTMLInputElement).value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="e.g. Amina Tariq"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="xeusar-signup-username"
                        className="block text-xs font-semibold text-white/85"
                      >
                        Username <span className="text-cyan-400">*</span>
                      </label>
                      {checkingUsername && (
                        <span className="text-[10px] font-mono text-white/50 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Checking...
                        </span>
                      )}
                      {!checkingUsername && usernameHint && (
                        <span
                          className={`text-[10px] font-mono ${
                            usernameAvailable ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {usernameHint}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <AtSign className="w-4 h-4 text-cyan-400/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="xeusar-signup-username"
                        name="username"
                        type="text"
                        required
                        autoComplete="username"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''));
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="amina_t"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                      />
                    </div>
                    <p className="text-[10px] text-white/40 mt-1">
                      3–30 characters. Letters, numbers, underscores, dots, or hyphens.
                    </p>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label
                      htmlFor="xeusar-signup-email"
                      className="block text-xs font-semibold text-white/85 mb-1.5"
                    >
                      Email Address <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="xeusar-signup-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="student@university.edu"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="xeusar-signup-password"
                      className="block text-xs font-semibold text-white/85 mb-1.5"
                    >
                      Password <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="xeusar-signup-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Minimum 8 characters"
                        className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="xeusar-signup-confirm-password"
                      className="block text-xs font-semibold text-white/85 mb-1.5"
                    >
                      Confirm Password <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="xeusar-signup-confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Re-enter your password"
                        className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Create Account Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 px-5 rounded-xl bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 text-black font-bold text-xs transition-all cursor-pointer shadow-[0_0_24px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Link to Login Page */}
                  <div className="pt-4 border-t border-white/10 text-center">
                    <p className="text-xs text-white/60">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => onChangeMode('login')}
                        className="text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer underline underline-offset-4"
                      >
                        Log In
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* ============================================================
                  2. CUSTOM XEUSAR LOGIN PAGE FORM
                  ============================================================ */}
              {mode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
                  {/* Email Address */}
                  <div>
                    <label
                      htmlFor="xeusar-login-email"
                      className="block text-xs font-semibold text-white/85 mb-1.5"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="xeusar-login-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@university.edu"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="xeusar-login-password"
                        className="block text-xs font-semibold text-white/85"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => onChangeMode('forgot-password')}
                        className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="xeusar-login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 px-5 rounded-xl bg-white hover:bg-white/90 disabled:opacity-50 text-black font-bold text-xs transition-all cursor-pointer shadow-[0_0_24px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Logging in...</span>
                      </>
                    ) : (
                      <>
                        <span>Login</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Link to Signup Page */}
                  <div className="pt-4 border-t border-white/10 text-center">
                    <p className="text-xs text-white/60">
                      Don't have a Xeusar account?{' '}
                      <button
                        type="button"
                        onClick={() => onChangeMode('signup')}
                        className="text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer underline underline-offset-4"
                      >
                        Sign Up
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* ============================================================
                  3. FORGOT PASSWORD RECOVERY REQUEST FORM
                  ============================================================ */}
              {mode === 'forgot-password' && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="xeusar-recovery-email"
                      className="block text-xs font-semibold text-white/85 mb-1.5"
                    >
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="xeusar-recovery-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@university.edu"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-5 rounded-xl bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Recovery Link...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Send Recovery Email</span>
                      </>
                    )}
                  </button>

                  <div className="pt-4 border-t border-white/10 text-center">
                    <button
                      type="button"
                      onClick={() => onChangeMode('login')}
                      className="text-xs text-white/60 hover:text-white font-medium cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Return to Login</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ============================================================
                  4. SET NEW PASSWORD FORM (Password Recovery Callback)
                  ============================================================ */}
              {mode === 'reset-password' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="xeusar-new-password"
                      className="block text-xs font-semibold text-white/85 mb-1.5"
                    >
                      New Password <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="xeusar-new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-[#00f0ff]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="xeusar-confirm-new-password"
                      className="block text-xs font-semibold text-white/85 mb-1.5"
                    >
                      Confirm New Password <span className="text-cyan-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="xeusar-confirm-new-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/15 rounded-xl text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-[#00f0ff]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-5 rounded-xl bg-[#00f0ff] hover:bg-[#00f0ff]/90 disabled:opacity-50 text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <span>Save New Password</span>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
