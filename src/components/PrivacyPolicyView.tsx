import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  Lock,
  Database,
  Server,
  Mail,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Scale,
  Info,
  BookOpen,
  ListFilter
} from 'lucide-react';
import {
  PRIVACY_POLICY_META,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_INQUIRY_MAILTO,
  ACCOUNT_DELETION_MAILTO,
  XEUSAR_CONTACT_EMAIL,
  GENERAL_CONTACT_MAILTO
} from '../data/privacyPolicyData.ts';
import { InfoCenterSectionId } from '../data/legalAndInfoData.ts';

interface PrivacyPolicyViewProps {
  onBackToHome: () => void;
  onOpenLibrary: () => void;
  onOpenInfoCenter?: (section?: InfoCenterSectionId) => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({
  onBackToHome,
  onOpenLibrary,
  onOpenInfoCenter
}) => {
  const [activeSectionId, setActiveSectionId] = useState<string>(
    PRIVACY_POLICY_SECTIONS[0]?.id || 'privacy-3-1'
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleJumpToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Render text with clickable team@xeusar.online links
  const renderFormattedText = (text: string) => {
    const parts = text.split(XEUSAR_CONTACT_EMAIL);

    if (parts.length === 1) {
      return <span>{text}</span>;
    }

    return (
      <>
        {parts.map((part, idx) => (
          <React.Fragment key={idx}>
            {part}
            {idx < parts.length - 1 && (
              <a
                href={GENERAL_CONTACT_MAILTO}
                className="text-cyan-300 hover:text-cyan-200 underline underline-offset-4 font-jetbrains font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded px-0.5"
              >
                {XEUSAR_CONTACT_EMAIL}
              </a>
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  return (
    <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-24 md:pb-16 font-outfit text-white">
      {/* Top Return & Legal Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs sm:text-sm font-semibold text-white/85 hover:text-white transition-all cursor-pointer self-start focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Back to Homepage</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-white/60 font-jetbrains">
          {onOpenInfoCenter && (
            <>
              <button
                type="button"
                onClick={() => onOpenInfoCenter('about')}
                className="hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>About Us</span>
              </button>
              <span className="text-white/25">•</span>
              <button
                type="button"
                onClick={() => onOpenInfoCenter('terms')}
                className="hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Scale className="w-3.5 h-3.5 text-cyan-400" />
                <span>Terms &amp; Conditions</span>
              </button>
              <span className="text-white/25">•</span>
            </>
          )}
          <a
            href={GENERAL_CONTACT_MAILTO}
            className="text-cyan-300 hover:text-cyan-200 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded px-1"
          >
            {XEUSAR_CONTACT_EMAIL}
          </a>
        </div>
      </div>

      {/* Hero Banner Card */}
      <header className="rounded-2xl sm:rounded-3xl border border-white/15 bg-black/60 backdrop-blur-xl p-6 sm:p-10 shadow-2xl mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-400 font-jetbrains">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>{PRIVACY_POLICY_META.eyebrow}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              {PRIVACY_POLICY_META.pageTitle}
            </h1>
            <p className="text-xs sm:text-base text-white/80 leading-relaxed">
              {PRIVACY_POLICY_META.summary}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2 shrink-0">
            <div className="text-xs font-jetbrains text-white/80 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
              Effective Date: <span className="text-cyan-300 font-semibold">{PRIVACY_POLICY_META.effectiveDate}</span>
            </div>
            <div className="text-xs font-jetbrains text-white/60 bg-white/[0.03] border border-white/10 px-3.5 py-1.5 rounded-full">
              Last Updated: {PRIVACY_POLICY_META.lastUpdated}
            </div>
          </div>
        </div>

        {/* Key Privacy Highlights Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white mb-0.5">No Sale of Personal Data</div>
              <p className="text-[11px] text-white/65 leading-relaxed">
                Xeusar never sells or rents student personal information to advertisers or data brokers.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
            <Server className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white mb-0.5">Verified Infrastructure</div>
              <p className="text-[11px] text-white/65 leading-relaxed">
                Powered by Supabase (Auth, Database &amp; Storage), Cloudflare (Hosting), and Resend (Email).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
            <Database className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white mb-0.5">Essential Storage Only</div>
              <p className="text-[11px] text-white/65 leading-relaxed">
                Uses localStorage &amp; session tokens for authentication and preferences—no ad trackers.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout: Interactive Table of Contents + Full Policy Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Table of Contents Navigation (Sticky on Desktop, Collapsible/Grid on Mobile) */}
        <aside
          aria-label="Privacy Policy Table of Contents"
          className="lg:col-span-4 lg:sticky lg:top-20 rounded-2xl sm:rounded-3xl border border-white/15 bg-[#0a0c12]/90 backdrop-blur-xl p-5 shadow-2xl"
        >
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10">
            <ListFilter className="w-4 h-4 text-cyan-400 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-jetbrains text-white">
              Table of Contents
            </h2>
          </div>

          <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1">
            {PRIVACY_POLICY_SECTIONS.map((sec) => {
              const isActive = activeSectionId === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleJumpToSection(sec.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isActive
                      ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/35 font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="font-jetbrains text-[11px] text-cyan-400/90 shrink-0">
                    {sec.number}
                  </span>
                  <span className="truncate">{sec.shortTitle}</span>
                </button>
              );
            })}
          </nav>

          {/* Direct Privacy Support Mini Card */}
          <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
            <div className="text-[11px] font-jetbrains uppercase tracking-wider text-white/50">
              Privacy &amp; Data Requests
            </div>
            <a
              href={PRIVACY_INQUIRY_MAILTO}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold font-jetbrains transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{XEUSAR_CONTACT_EMAIL}</span>
            </a>
          </div>
        </aside>

        {/* Policy Sections Column */}
        <div className="lg:col-span-8 rounded-2xl sm:rounded-3xl border border-white/15 bg-black/55 backdrop-blur-xl p-6 sm:p-10 shadow-2xl space-y-10">
          {PRIVACY_POLICY_SECTIONS.map((sec) => (
            <section
              key={sec.id}
              id={sec.id}
              aria-labelledby={`heading-${sec.id}`}
              className="scroll-mt-28 space-y-4 pb-8 border-b border-white/10 last:border-b-0 last:pb-0"
            >
              <h2
                id={`heading-${sec.id}`}
                className="text-lg sm:text-2xl font-bold text-white flex items-baseline gap-2.5"
              >
                <span className="text-cyan-400 font-jetbrains text-sm sm:text-base shrink-0">
                  {sec.number}
                </span>
                <span>{sec.title}</span>
              </h2>

              <div className="space-y-3.5 text-xs sm:text-sm text-white/80 leading-relaxed">
                {sec.paragraphs.map((p, idx) => (
                  <p key={idx}>{renderFormattedText(p)}</p>
                ))}

                {/* Subsections (e.g., 3.2 Information We Collect & 3.5 How Information Is Shared) */}
                {sec.subsections && (
                  <div className="space-y-3.5 pt-1">
                    {sec.subsections.map((sub, idx) => (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2"
                      >
                        <h3 className="text-sm sm:text-base font-bold text-cyan-300">
                          {sub.title}
                        </h3>
                        {sub.description && (
                          <p className="text-xs sm:text-sm text-white/75">
                            {renderFormattedText(sub.description)}
                          </p>
                        )}
                        {sub.bullets && (
                          <ul className="list-disc list-inside space-y-1.5 pl-1 text-xs sm:text-sm text-white/80">
                            {sub.bullets.map((b, bIdx) => (
                              <li key={bIdx}>{renderFormattedText(b)}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Standard Bullet List */}
                {sec.bulletIntro && (
                  <p className="font-semibold text-white/90 pt-1">{sec.bulletIntro}</p>
                )}

                {sec.bullets && (
                  <ul className="space-y-2 pt-1">
                    {sec.bullets.map((bullet, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs sm:text-sm text-white/80"
                      >
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{renderFormattedText(bullet)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Third-Party Service Providers Cards (Section 3.4) */}
                {sec.providers && (
                  <div className="grid grid-cols-1 gap-3.5 pt-2">
                    {sec.providers.map((provider) => (
                      <div
                        key={provider.name}
                        className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-sm sm:text-base font-bold text-white">
                            {provider.name}
                          </span>
                          <span className="text-[11px] font-jetbrains text-cyan-300 bg-cyan-500/10 border border-cyan-400/25 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                            {provider.role}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                          {renderFormattedText(provider.description)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Highlight / Callout Box */}
                {sec.highlightBox && (
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border space-y-1.5 ${
                      sec.highlightBox.tone === 'amber'
                        ? 'bg-amber-950/20 border-amber-400/35 text-amber-100'
                        : sec.highlightBox.tone === 'emerald'
                        ? 'bg-emerald-950/20 border-emerald-400/35 text-emerald-100'
                        : 'bg-cyan-950/25 border-cyan-400/35 text-cyan-50'
                    }`}
                  >
                    {sec.highlightBox.title && (
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-white">
                        {sec.highlightBox.tone === 'amber' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                        ) : (
                          <Shield className="w-4 h-4 text-cyan-300 shrink-0" />
                        )}
                        <span>{sec.highlightBox.title}</span>
                      </div>
                    )}
                    <p className="text-xs sm:text-sm leading-relaxed text-white/85">
                      {renderFormattedText(sec.highlightBox.text)}
                    </p>
                  </div>
                )}

                {/* Additional Paragraphs After Lists/Tables */}
                {sec.afterParagraphs &&
                  sec.afterParagraphs.map((p, idx) => (
                    <p key={idx}>{renderFormattedText(p)}</p>
                  ))}

                {/* Contact Section Card (Section 3.14) */}
                {sec.isContactSection && (
                  <div className="mt-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-cyan-950/30 via-black/70 to-black/80 border border-cyan-400/35 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-black/50 border border-white/10">
                        <div className="text-[11px] uppercase tracking-wider text-white/50 font-jetbrains mb-1">
                          Privacy &amp; Support Email
                        </div>
                        <a
                          href={GENERAL_CONTACT_MAILTO}
                          className="text-sm sm:text-base font-bold font-jetbrains text-cyan-300 hover:text-cyan-200 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
                        >
                          {XEUSAR_CONTACT_EMAIL}
                        </a>
                      </div>

                      <div className="p-4 rounded-xl bg-black/50 border border-white/10">
                        <div className="text-[11px] uppercase tracking-wider text-white/50 font-jetbrains mb-1">
                          Platform
                        </div>
                        <button
                          type="button"
                          onClick={onBackToHome}
                          className="text-sm sm:text-base font-bold font-jetbrains text-white hover:text-cyan-300 underline underline-offset-4 inline-flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
                        >
                          <span>Xeusar — Free Educational Platform</span>
                          <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <a
                        href={PRIVACY_INQUIRY_MAILTO}
                        className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition-colors inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-white"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Privacy Inquiry</span>
                      </a>
                      <a
                        href={ACCOUNT_DELETION_MAILTO}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition-colors inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      >
                        <Mail className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Request Account Deletion</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </section>
          ))}

          {/* Bottom Navigation Bar inside Policy Document */}
          <div className="pt-6 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black hover:bg-white/90 text-xs sm:text-sm font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Homepage</span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {onOpenInfoCenter && (
                <button
                  type="button"
                  onClick={() => onOpenInfoCenter('terms')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-white/80 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <Scale className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Terms &amp; Conditions</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenLibrary}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-white/80 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Study Library</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
