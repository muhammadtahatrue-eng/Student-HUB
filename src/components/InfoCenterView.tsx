import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Users,
  Mail,
  ShieldAlert,
  FileText,
  HelpCircle,
  Scale,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import {
  XEUSAR_CONTACT_EMAIL,
  COPYRIGHT_REPORT_SUBJECT,
  COPYRIGHT_REPORT_MAILTO,
  GENERAL_CONTACT_MAILTO,
  InfoCenterSectionId,
  ABOUT_XEUSAR_CONTENT,
  FAQ_ITEMS,
  TERMS_AND_CONDITIONS_META,
  TERMS_SECTIONS,
  COPYRIGHT_REPORTING_CHECKLIST,
  UPLOAD_COPYRIGHT_NOTICE
} from '../data/legalAndInfoData.ts';

interface InfoCenterViewProps {
  initialSection?: InfoCenterSectionId;
  onBackToHome: () => void;
  onOpenLibrary: () => void;
  onOpenExplorePrograms?: () => void;
  onOpenForum?: () => void;
}

export const InfoCenterView: React.FC<InfoCenterViewProps> = ({
  initialSection = 'about',
  onBackToHome,
  onOpenLibrary,
  onOpenExplorePrograms,
  onOpenForum
}) => {
  const [activeNav, setActiveNav] = useState<InfoCenterSectionId>(initialSection);
  const [openFaqIds, setOpenFaqIds] = useState<Record<string, boolean>>({
    q1: true,
    q5: true,
    q9: true
  });

  useEffect(() => {
    setActiveNav(initialSection);
    if (initialSection === 'about') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const sectionElementId = `info-section-${initialSection}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionElementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [initialSection]);

  const handleJumpToSection = (sectionId: InfoCenterSectionId) => {
    setActiveNav(sectionId);
    const el = document.getElementById(`info-section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleFaq = (id: string) => {
    setOpenFaqIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandAllFaqs = () => {
    const allOpen: Record<string, boolean> = {};
    FAQ_ITEMS.forEach((item) => {
      allOpen[item.id] = true;
    });
    setOpenFaqIds(allOpen);
  };

  const collapseAllFaqs = () => {
    setOpenFaqIds({});
  };

  const getOfferingIcon = (title: string) => {
    if (title === 'Study Library') return BookOpen;
    if (title === 'Academic Programs') return GraduationCap;
    if (title === 'Community Forum') return MessageSquare;
    return Users;
  };

  const getOfferingAction = (title: string) => {
    if (title === 'Study Library') return onOpenLibrary;
    if (title === 'Academic Programs') return onOpenExplorePrograms;
    if (title === 'Community Forum') return onOpenForum;
    return undefined;
  };

  // Helper to render FAQ answers with clickable team@xeusar.online links
  const renderFaqAnswer = (answer: string, isCopyright?: boolean) => {
    const parts = answer.split(XEUSAR_CONTACT_EMAIL);
    if (parts.length === 1) {
      return <span>{answer}</span>;
    }
    const mailtoHref = isCopyright ? COPYRIGHT_REPORT_MAILTO : GENERAL_CONTACT_MAILTO;
    return (
      <>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <a
                href={mailtoHref}
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
    <div className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-24 md:pb-16 font-outfit text-white">
      {/* Top Return & Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs sm:text-sm font-semibold text-white/85 hover:text-white transition-all cursor-pointer self-start focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Back to Homepage</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-white/60 font-jetbrains">
          <span>Official Information Center</span>
          <span className="text-white/25">•</span>
          <a
            href={GENERAL_CONTACT_MAILTO}
            className="text-cyan-300 hover:text-cyan-200 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded px-1"
          >
            {XEUSAR_CONTACT_EMAIL}
          </a>
        </div>
      </div>

      {/* Sticky Section Navigation Bar */}
      <nav
        aria-label="Information Center Sections"
        className="sticky top-16 sm:top-20 z-30 mb-8 p-1.5 rounded-2xl bg-[#0a0c12]/90 border border-white/15 backdrop-blur-xl shadow-2xl overflow-x-auto"
      >
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: 'about' as InfoCenterSectionId, label: 'About Xeusar', icon: Info },
            { id: 'faq' as InfoCenterSectionId, label: 'FAQs', icon: HelpCircle },
            { id: 'terms' as InfoCenterSectionId, label: 'Terms & Conditions', icon: Scale },
            {
              id: 'copyright' as InfoCenterSectionId,
              label: 'Copyright Policy & Reporting',
              icon: ShieldAlert
            },
            { id: 'contact' as InfoCenterSectionId, label: 'Contact Us', icon: Mail }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeNav === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleJumpToSection(tab.id)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  isActive
                    ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                    : 'text-white/75 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="space-y-12 sm:space-y-16">
        {/* ==================================================================
            1. ABOUT XEUSAR SECTION
            ================================================================== */}
        <section
          id="info-section-about"
          aria-labelledby="heading-about-xeusar"
          className="scroll-mt-36 rounded-2xl sm:rounded-3xl border border-white/15 bg-black/55 backdrop-blur-xl p-6 sm:p-10 shadow-2xl space-y-8"
        >
          <div className="border-b border-white/10 pb-6">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-400 font-jetbrains mb-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{ABOUT_XEUSAR_CONTENT.title}</span>
            </div>
            <h1
              id="heading-about-xeusar"
              className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-4"
            >
              {ABOUT_XEUSAR_CONTENT.subtitle}
            </h1>
            <div className="space-y-3 max-w-3xl">
              {ABOUT_XEUSAR_CONTENT.introParagraphs.map((p, idx) => (
                <p key={idx} className="text-sm sm:text-base text-white/80 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </div>

          {/* Our Mission & Our Vision Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-cyan-300">
                {ABOUT_XEUSAR_CONTENT.missionTitle}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                {ABOUT_XEUSAR_CONTENT.missionText}
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-cyan-300">
                {ABOUT_XEUSAR_CONTENT.visionTitle}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                {ABOUT_XEUSAR_CONTENT.visionText}
              </p>
            </div>
          </div>

          {/* What Xeusar Offers */}
          <div className="space-y-4">
            <h2 className="text-lg sm:text-2xl font-bold text-white">
              {ABOUT_XEUSAR_CONTENT.offeringsTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ABOUT_XEUSAR_CONTENT.offerings.map((offering) => {
                const Icon = getOfferingIcon(offering.title);
                const action = getOfferingAction(offering.title);
                return (
                  <div
                    key={offering.title}
                    onClick={action}
                    className={`p-5 rounded-2xl bg-white/[0.03] border border-white/10 transition-colors flex flex-col justify-between ${
                      action ? 'hover:border-cyan-400/40 cursor-pointer group' : ''
                    }`}
                  >
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 mb-3">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors mb-1.5">
                        {offering.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                        {offering.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Our Commitment & Institutional Independence */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white">
              {ABOUT_XEUSAR_CONTENT.commitmentTitle}
            </h2>
            {ABOUT_XEUSAR_CONTENT.commitmentParagraphs.map((paragraph, idx) => (
              <p
                key={idx}
                className={`text-xs sm:text-sm leading-relaxed ${
                  idx === 1 ? 'text-white/65 pt-2 border-t border-white/10' : 'text-white/80'
                }`}
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Get in Touch Sub-panel */}
          <div className="p-5 sm:p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-white">
                {ABOUT_XEUSAR_CONTENT.getInTouchTitle}
              </h2>
              <p className="text-xs sm:text-sm text-white/80">
                {ABOUT_XEUSAR_CONTENT.getInTouchPrompt}
              </p>
              <p className="text-xs text-white/60">{ABOUT_XEUSAR_CONTENT.getInTouchClosing}</p>
            </div>
            <a
              href={GENERAL_CONTACT_MAILTO}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs sm:text-sm font-bold font-jetbrains transition-colors shrink-0 self-start sm:self-center focus:outline-none focus:ring-2 focus:ring-white"
            >
              <Mail className="w-4 h-4" />
              <span>{XEUSAR_CONTACT_EMAIL}</span>
            </a>
          </div>
        </section>

        {/* ==================================================================
            2. FREQUENTLY ASKED QUESTIONS SECTION
            ================================================================== */}
        <section
          id="info-section-faq"
          aria-labelledby="heading-faq"
          className="scroll-mt-36 rounded-2xl sm:rounded-3xl border border-white/15 bg-black/55 backdrop-blur-xl p-6 sm:p-10 shadow-2xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-400 font-jetbrains mb-2">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Support &amp; Guidance</span>
              </div>
              <h2 id="heading-faq" className="text-2xl sm:text-3xl font-bold text-white">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={expandAllFaqs}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAllFaqs}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => {
              const isOpen = Boolean(openFaqIds[item.id]);
              const answerId = `faq-answer-${item.id}`;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-colors ${
                    isOpen
                      ? 'border-cyan-400/40 bg-white/[0.04]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <h3>
                    <button
                      type="button"
                      onClick={() => toggleFaq(item.id)}
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <span className="text-sm sm:text-base font-bold text-white">
                        {item.question}
                      </span>
                      <span className="p-1 rounded-lg bg-white/5 text-cyan-300 shrink-0">
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </span>
                    </button>
                  </h3>
                  {isOpen && (
                    <div
                      id={answerId}
                      className="px-5 pb-5 pt-1 text-xs sm:text-sm text-white/80 leading-relaxed border-t border-white/10"
                    >
                      {renderFaqAnswer(item.answer, item.hasCopyrightMailto)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ==================================================================
            3. TERMS & CONDITIONS SECTION
            ================================================================== */}
        <section
          id="info-section-terms"
          aria-labelledby="heading-terms"
          className="scroll-mt-36 rounded-2xl sm:rounded-3xl border border-white/15 bg-black/55 backdrop-blur-xl p-6 sm:p-10 shadow-2xl space-y-8"
        >
          <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-400 font-jetbrains mb-2">
                <Scale className="w-3.5 h-3.5 shrink-0" />
                <span>Platform Governance</span>
              </div>
              <h2 id="heading-terms" className="text-2xl sm:text-4xl font-bold text-white">
                {TERMS_AND_CONDITIONS_META.pageTitle}
              </h2>
            </div>
            <div className="text-xs font-jetbrains text-white/60 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full self-start sm:self-auto">
              Last updated: {TERMS_AND_CONDITIONS_META.lastUpdated}
            </div>
          </div>

          <div className="space-y-8">
            {TERMS_SECTIONS.map((sec) => (
              <div
                key={sec.id}
                id={sec.id}
                className="space-y-3 pb-6 border-b border-white/10 last:border-b-0 last:pb-0"
              >
                <h3 className="text-base sm:text-xl font-bold text-white flex items-baseline gap-2.5">
                  <span className="text-cyan-400 font-jetbrains text-sm sm:text-base">
                    {sec.number}
                  </span>
                  <span>{sec.title}</span>
                </h3>

                <div className="space-y-3 max-w-3xl text-xs sm:text-sm text-white/80 leading-relaxed">
                  {sec.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}

                  {sec.highlightText && (
                    <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white font-semibold">
                      {sec.highlightText}
                    </div>
                  )}

                  {sec.isCopyrightReportingSection && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/20 border border-amber-400/30 space-y-2 my-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs sm:text-sm text-white">
                          <span className="font-bold text-amber-300">Contact email: </span>
                          <a
                            href={COPYRIGHT_REPORT_MAILTO}
                            className="text-cyan-300 hover:text-cyan-200 underline underline-offset-4 font-jetbrains font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded px-0.5"
                          >
                            {XEUSAR_CONTACT_EMAIL}
                          </a>
                        </div>
                        <div className="text-xs text-white/75 font-jetbrains">
                          <span className="text-white/50">Recommended subject: </span>
                          <span className="text-amber-200 font-semibold">
                            {COPYRIGHT_REPORT_SUBJECT}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {sec.bulletIntro && (
                    <p className="font-semibold text-white/90 pt-1">{sec.bulletIntro}</p>
                  )}

                  {sec.bullets && (
                    <ul className="list-disc list-inside space-y-1.5 pl-1 text-white/80">
                      {sec.bullets.map((bullet, idx) => (
                        <li key={idx}>{bullet}</li>
                      ))}
                    </ul>
                  )}

                  {sec.orderedList && (
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 text-white/80">
                      {sec.orderedList.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ol>
                  )}

                  {sec.afterListParagraphs &&
                    sec.afterListParagraphs.map((p, idx) => <p key={idx}>{p}</p>)}

                  {sec.isContactSection && (
                    <div className="pt-2">
                      <span className="font-bold text-white">Email: </span>
                      <a
                        href={GENERAL_CONTACT_MAILTO}
                        className="text-cyan-300 hover:text-cyan-200 underline underline-offset-4 font-jetbrains font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded px-0.5"
                      >
                        {XEUSAR_CONTACT_EMAIL}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Dedicated Subsection within Terms & Conditions: Report Copyright Infringement */}
          <div
            id="info-section-copyright"
            className="scroll-mt-36 mt-8 rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-950/30 via-black/70 to-black/80 p-6 sm:p-8 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-300 font-jetbrains mb-1">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Copyright Policy &amp; Reporting</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Report Copyright Infringement
                </h3>
              </div>

              <a
                href={COPYRIGHT_REPORT_MAILTO}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs sm:text-sm font-bold transition-colors self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-white"
              >
                <Mail className="w-4 h-4" />
                <span>Send Copyright Report</span>
              </a>
            </div>

            <p className="text-xs sm:text-sm text-white/85 leading-relaxed max-w-3xl">
              Copyright owners and their authorized representatives may submit a report if they
              believe copyrighted material has been shared on Xeusar without authorization.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[11px] uppercase tracking-wider text-white/50 font-jetbrains mb-1">
                  Reporting Email Address
                </div>
                <a
                  href={COPYRIGHT_REPORT_MAILTO}
                  className="text-sm sm:text-base font-bold font-jetbrains text-cyan-300 hover:text-cyan-200 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
                >
                  {XEUSAR_CONTACT_EMAIL}
                </a>
              </div>

              <div className="p-4 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[11px] uppercase tracking-wider text-white/50 font-jetbrains mb-1">
                  Suggested Email Subject Line
                </div>
                <div className="text-sm sm:text-base font-bold font-jetbrains text-white">
                  {COPYRIGHT_REPORT_SUBJECT}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white/90 font-jetbrains">
                Information Needed for Review (Checklist)
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {COPYRIGHT_REPORTING_CHECKLIST.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs sm:text-sm text-white/80"
                  >
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/70 space-y-1.5 leading-relaxed">
              <p>
                <strong className="text-white/90">{UPLOAD_COPYRIGHT_NOTICE.label}</strong>{' '}
                {UPLOAD_COPYRIGHT_NOTICE.text}
              </p>
              <p className="text-white/60">
                Reports are reviewed and appropriate action is taken based on the circumstances and
                applicable law, which may include removing or restricting access to reported
                material.
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================
            5. CONTACT US & PRIVACY POLICY NOTICE SECTION
            ================================================================== */}
        <section
          id="info-section-contact"
          aria-labelledby="heading-contact"
          className="scroll-mt-36 grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Contact Us Card */}
          <div className="lg:col-span-7 rounded-2xl sm:rounded-3xl border border-white/15 bg-black/55 backdrop-blur-xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-400 font-jetbrains">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>Direct Support &amp; Inquiries</span>
              </div>
              <h2 id="heading-contact" className="text-2xl sm:text-3xl font-bold text-white">
                Contact Us
              </h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Have questions about Xeusar, account support, inappropriate content reports,
                copyright concerns, or feature suggestions? Reach our team directly by email.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-jetbrains uppercase tracking-wider text-white/50">
                    Official Platform Email
                  </div>
                  <a
                    href={GENERAL_CONTACT_MAILTO}
                    className="text-base sm:text-lg font-bold font-jetbrains text-cyan-300 hover:text-cyan-200 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
                  >
                    {XEUSAR_CONTACT_EMAIL}
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={GENERAL_CONTACT_MAILTO}
                    className="px-4 py-2 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold transition-colors inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Team</span>
                  </a>
                  <a
                    href={COPYRIGHT_REPORT_MAILTO}
                    className="px-4 py-2 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/30 text-cyan-300 text-xs font-bold transition-colors inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Copyright Removal Request</span>
                  </a>
                </div>
              </div>
              <p className="text-[11px] text-amber-300/85 pt-2 border-t border-white/10">
                Security reminder: Never send your password, verification codes, or other
                authentication secrets in your email.
              </p>
            </div>
          </div>

          {/* Privacy Policy Information Card */}
          <div className="lg:col-span-5 rounded-2xl sm:rounded-3xl border border-white/15 bg-black/55 backdrop-blur-xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/60 font-jetbrains">
                <FileText className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                <span>Privacy Documentation</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Privacy Policy Notice</h2>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                These Terms &amp; Conditions govern platform usage and copyright responsibilities
                and do not replace a standalone Privacy Policy.
              </p>
              <p className="text-xs text-white/60 leading-relaxed">
                For questions regarding your account data or privacy requests, please contact{' '}
                <a
                  href={GENERAL_CONTACT_MAILTO}
                  className="text-cyan-300 hover:text-cyan-200 underline underline-offset-4 font-jetbrains focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
                >
                  {XEUSAR_CONTACT_EMAIL}
                </a>{' '}
                with only the details necessary to explain your request.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded px-1 py-0.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Homepage</span>
              </button>
              <button
                type="button"
                onClick={onOpenLibrary}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded px-1 py-0.5"
              >
                <span>Browse Study Library</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
