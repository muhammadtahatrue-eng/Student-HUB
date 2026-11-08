import { XEUSAR_CONTACT_EMAIL, GENERAL_CONTACT_MAILTO } from './legalAndInfoData.ts';

export const PRIVACY_INQUIRY_SUBJECT = 'Privacy Inquiry - Xeusar';
export const PRIVACY_INQUIRY_MAILTO = `mailto:${XEUSAR_CONTACT_EMAIL}?subject=${encodeURIComponent(
  PRIVACY_INQUIRY_SUBJECT
)}`;
export const ACCOUNT_DELETION_SUBJECT = 'Account Deletion Request - Xeusar';
export const ACCOUNT_DELETION_MAILTO = `mailto:${XEUSAR_CONTACT_EMAIL}?subject=${encodeURIComponent(
  ACCOUNT_DELETION_SUBJECT
)}`;

export interface PrivacySubSection {
  title: string;
  description?: string;
  bullets?: string[];
}

export interface PrivacyProviderItem {
  name: string;
  role: string;
  description: string;
  website?: string;
}

export interface PrivacyStorageItem {
  keyPattern: string;
  purpose: string;
  storageType: string;
}

export interface PrivacySectionItem {
  id: string;
  number: string;
  shortTitle: string;
  title: string;
  paragraphs: string[];
  subsections?: PrivacySubSection[];
  bullets?: string[];
  bulletIntro?: string;
  providers?: PrivacyProviderItem[];
  storageItems?: PrivacyStorageItem[];
  highlightBox?: {
    title?: string;
    text: string;
    tone?: 'cyan' | 'amber' | 'emerald';
  };
  afterParagraphs?: string[];
  isContactSection?: boolean;
}

export const PRIVACY_POLICY_META = {
  eyebrow: 'DATA PROTECTION & TRANSPARENCY',
  pageTitle: 'Privacy Policy',
  effectiveDate: 'November 3, 2026',
  lastUpdated: 'November 3, 2026',
  summary:
    'This Privacy Policy explains how Xeusar collects, uses, stores, shares, and protects information when you use our academic learning and collaboration platform, Study Library, Academic Programs, and Community Forum.'
};

export const PRIVACY_POLICY_SECTIONS: PrivacySectionItem[] = [
  {
    id: 'privacy-3-1',
    number: '3.1',
    shortTitle: 'Introduction',
    title: 'Introduction',
    paragraphs: [
      'Welcome to Xeusar ("Xeusar," "we," "our," or "us"). This Privacy Policy describes how we collect, use, store, share, and protect personal information when you access or use the Xeusar website, our free educational platform and study resource directory, the Study Library, academic program directories, the Community Forum, account management features, and related educational services (collectively, the "Platform").',
      'We believe privacy transparency is essential to a trustworthy academic community. By accessing or using Xeusar, please review this Privacy Policy carefully so you understand our data practices and the choices available to you. This Privacy Policy works alongside our Terms & Conditions.'
    ]
  },
  {
    id: 'privacy-3-2',
    number: '3.2',
    shortTitle: 'Information We Collect',
    title: 'Information We Collect',
    paragraphs: [
      'We collect only the information reasonably necessary to operate Xeusar, authenticate registered students, organize academic resources, and support community collaboration. Depending on how you interact with the Platform (as a visitor browsing the Study Library or as a registered member), we collect the following categories of information:'
    ],
    subsections: [
      {
        title: '1. Account Information',
        description:
          'When you register for a Xeusar account or sign in, our authentication system processes:',
        bullets: [
          'Email address used for account registration, login, and verification.',
          'Username (unique handle) and display name.',
          'Authentication credentials (passwords are securely hashed and managed directly by our authentication provider, Supabase Auth, and are never stored in plain text or visible to Xeusar staff).',
          'Email verification status and confirmation timestamp (email_confirmed_at), account role, and account creation or update timestamps.'
        ]
      },
      {
        title: '2. Academic and Profile Information',
        description:
          'When you complete post-signup onboarding (Profile Setup) or update your profile and settings, you may provide:',
        bullets: [
          'Education or degree level (e.g., Undergraduate, Postgraduate, High School / A-Levels, Doctorate).',
          'Institution, university, college, or school affiliation.',
          'Academic degree program, major or field of study, and current semester number.',
          'Academic study goals, short biography, and skills or academic interests.',
          'Profile avatar (either a selected preset avatar or an image file uploaded to your profile).',
          'Interface and visual preferences, including your custom background flare settings (color, origin position, lock state, and brightness intensity).'
        ]
      },
      {
        title: '3. User-Submitted Content',
        description:
          'When you contribute to the Study Library, Academic Programs, or Community Forum, we store the content and metadata you submit:',
        bullets: [
          'Uploaded study materials and files (such as PDF lecture notes, summaries, past papers, assignments, or external educational links).',
          'Resource metadata including document title, description, course code, course name, subject/discipline category, degree program, semester number, professor name, academic year, and tags.',
          'Community Forum posts, replies/comments, topic tags, attached resource references, and post/note upvotes.',
          'Confirmations that you hold the necessary rights or permission to share uploaded study materials.'
        ]
      },
      {
        title: '4. Technical and Usage Information',
        description:
          'When you access the Xeusar website, our hosting and backend infrastructure automatically processes standard technical data required to deliver the website and maintain security:',
        bullets: [
          'IP address and approximate network region inferred from standard HTTP requests.',
          'Browser type and version, device type, operating system, and screen/viewport characteristics.',
          'Referring URLs, pages or routes requested, timestamps, authentication session identifiers, and diagnostic or security logs.'
        ]
      },
      {
        title: '5. Communications',
        description:
          'When you contact us directly via email at team@xeusar.online, we receive:',
        bullets: [
          'Your name, email address, subject line, and the contents of your message.',
          'Information included in copyright infringement notices (Copyright Removal Requests), abuse reports, feature suggestions, or account support inquiries.'
        ]
      }
    ],
    highlightBox: {
      title: 'Information Xeusar Does Not Collect',
      text: 'Xeusar does not collect payment card numbers, bank account details, or billing records; does not request precise GPS geolocation; does not collect biometric identifiers; and does not use third-party advertising identifiers.',
      tone: 'cyan'
    }
  },
  {
    id: 'privacy-3-3',
    number: '3.3',
    shortTitle: 'How We Use Information',
    title: 'How We Use Information',
    paragraphs: [
      'We use the information we collect strictly for legitimate educational, operational, security, and support purposes:'
    ],
    bullets: [
      'Create, verify, authenticate, and manage your Xeusar student account.',
      'Send transactional account verification emails, password recovery links, security alerts, and essential service notices.',
      'Operate and provide the Study Library, Academic Program directories, Community Forum, and file preview/download functionality.',
      'Display user-submitted study notes, forum discussions, and author attribution (@username, display name, and program) according to platform features.',
      'Save and synchronize your personalized account preferences—including your background flare configuration and enrolled academic program—across sessions.',
      'Respond to questions, feature suggestions, support requests, and copyright or community moderation reports sent to team@xeusar.online.',
      'Protect platform security, enforce route access controls (such as verifying email confirmation before granting access to protected features), and prevent spam, abuse, or unauthorized access.',
      'Monitor, troubleshoot, debug, and improve platform reliability, usability, and academic organization.',
      'Comply with applicable legal obligations and enforce our Terms & Conditions and Copyright Policy.'
    ]
  },
  {
    id: 'privacy-3-4',
    number: '3.4',
    shortTitle: 'Third-Party Service Providers',
    title: 'Third-Party Service Providers',
    paragraphs: [
      'Xeusar works with third-party service providers to operate, maintain, secure, and support the platform. These providers may process limited personal information as necessary to deliver the services we use.',
      'Our service providers may include companies that provide website hosting, user authentication, backend infrastructure, database services, and email delivery.',
      'For example:'
    ],
    providers: [
      {
        name: 'Supabase',
        role: 'Authentication & Backend Services',
        description:
          'Used for authentication and backend services, including database functionality and cloud storage where configured.'
      },
      {
        name: 'Cloudflare',
        role: 'Website Hosting & Delivery',
        description: 'Used to host and deliver the Xeusar website.'
      },
      {
        name: 'Resend',
        role: 'Email Delivery',
        description:
          'Used to deliver emails, such as account-related or verification emails, where configured.'
      }
    ],
    afterParagraphs: [
      'The information processed by each provider depends on the features enabled, our configuration, and the service being used. Each provider may process information under its applicable privacy policy and contractual terms.',
      "We share information with service providers only as reasonably necessary for the services they perform, subject to applicable legal requirements. We do not sell personal information as part of Xeusar's stated operating model."
    ]
  },
  {
    id: 'privacy-3-5',
    number: '3.5',
    shortTitle: 'How Information Is Shared',
    title: 'How Information Is Shared',
    paragraphs: [
      'Xeusar does not sell, rent, or trade your personal information to third parties or data brokers.',
      'Information is shared or made visible only in the following limited circumstances:'
    ],
    subsections: [
      {
        title: 'Public and Community Information',
        bullets: [
          'Study Library Contributions: When you upload study notes or educational resources to the Study Library, the resource file, title, course metadata, and your uploader attribution (display name or @username) are visible to visitors and registered users who browse the Study Library.',
          'Community Forum & Academic Programs: When you publish a forum post, write a comment, or participate in program discussions, your display name, @username, avatar, academic program badge, and post content are visible to signed-in community members.'
        ]
      },
      {
        title: 'Infrastructure Service Providers',
        bullets: [
          'We share necessary technical and account data with Supabase, Cloudflare, and Resend strictly to host the website, authenticate accounts, store uploaded files and database records, and deliver verification emails.'
        ]
      },
      {
        title: 'Copyright & Policy Enforcement',
        bullets: [
          'When investigating good-faith copyright infringement notices (Copyright Removal Requests) or violations of our Terms & Conditions, we may review relevant submission records and communicate with the reporting party or the uploader as reasonably necessary to resolve the issue.'
        ]
      },
      {
        title: 'Legal Compliance & Safety',
        bullets: [
          'We may disclose information if required to do so by applicable law, regulation, subpoena, or valid legal process, or when we believe in good faith that disclosure is reasonably necessary to protect the safety, rights, security, or integrity of Xeusar, our users, or the public.'
        ]
      },
      {
        title: 'Platform Operational Changes',
        bullets: [
          'If Xeusar undergoes a project restructuring, transfer of stewardship, merger, or similar operational transition, information may be transferred as part of that transition subject to continued privacy protections.'
        ]
      }
    ]
  },
  {
    id: 'privacy-3-6',
    number: '3.6',
    shortTitle: 'Cookies, Sessions & Local Storage',
    title: 'Cookies, Sessions, and Local Storage',
    paragraphs: [
      'Xeusar uses essential browser storage mechanisms—primarily HTML5 localStorage and session tokens—to maintain your signed-in state, verify your email session, and remember your interface preferences.'
    ],
    highlightBox: {
      title: 'No Advertising Cookies or Third-Party Ad Trackers',
      text: 'Xeusar does not use third-party advertising cookies, cross-site tracking pixels, behavioral profiling scripts, or third-party marketing analytics.',
      tone: 'emerald'
    },
    afterParagraphs: [
      'Managing Browser Storage: You can clear your browser cookies and localStorage at any time through your web browser settings, or clear your active session by clicking "Logout" in your account menu. Please note that disabling or clearing essential storage will sign you out and reset locally cached preferences to their default state (Ash Grey top-center background flare at 50% intensity).'
    ]
  },
  {
    id: 'privacy-3-7',
    number: '3.7',
    shortTitle: 'Data Retention & Deletion',
    title: 'Data Retention',
    paragraphs: [
      'We retain personal information only for as long as reasonably necessary to provide the Platform, fulfill the purposes described in this Privacy Policy, and comply with legal or security requirements:'
    ],
    bullets: [
      'Account & Profile Data: Retained while your Xeusar account remains active so you can access your profile, academic program, and saved preferences.',
      'Self-Service Content Deletion (In-App): Registered users can directly edit or delete their own uploaded study notes in the Study Library and My Program views, and can edit or delete their own posts and comments in the Community Forum at any time.',
      'Account Deletion Requests: If you wish to permanently delete your Xeusar user account and associated personal profile data, you may request account deletion by emailing team@xeusar.online from the email address associated with your account.',
      'Security Logs & Legal Records: Standard diagnostic logs, copyright removal records, and abuse-prevention records may be retained for a reasonable period where necessary to protect platform security, resolve disputes, or comply with applicable law.'
    ]
  },
  {
    id: 'privacy-3-8',
    number: '3.8',
    shortTitle: 'Data Security',
    title: 'Data Security',
    paragraphs: [
      'We implement reasonable technical and organizational safeguards designed to protect your information against unauthorized access, alteration, disclosure, or destruction. These measures include HTTPS/TLS encryption in transit, managed token-based authentication through Supabase Auth, mandatory email verification (email_confirmed_at) before granting access to restricted platform features, and ownership checks on user-managed content.',
      'However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your personal information using industry-standard practices, we cannot guarantee absolute security.',
      'Your Role in Security: Please use a strong, unique password for your Xeusar account, keep your login credentials confidential, and notify us promptly at team@xeusar.online if you suspect any unauthorized access to your account.'
    ]
  },
  {
    id: 'privacy-3-9',
    number: '3.9',
    shortTitle: 'International Processing',
    title: 'International Processing',
    paragraphs: [
      'Xeusar is accessible globally, and our infrastructure service providers (including Cloudflare, Supabase, and Resend) may process and store data on cloud servers located in the United States, the European Union, or other regions outside your country of residence.',
      'Data protection laws in these jurisdictions may differ from those in your home country. By using Xeusar, you understand that your information may be transferred to and processed in these regions by our service providers in accordance with this Privacy Policy and applicable legal safeguards.'
    ]
  },
  {
    id: 'privacy-3-10',
    number: '3.10',
    shortTitle: 'Your Privacy Rights & Choices',
    title: 'Your Privacy Rights and Choices',
    paragraphs: [
      'Depending on your location and applicable data protection laws, you may have specific rights regarding your personal information:'
    ],
    bullets: [
      'Access & Portability: Request confirmation of what personal information we hold about you and request a copy of your account data.',
      'Correction (Rectification): Update or correct your display name, username, academic institution, degree program, bio, avatar, and appearance settings directly through your "My Profile" and "Settings" pages, or by contacting us.',
      'Content & Account Deletion (Erasure): Delete your own uploaded study notes and forum posts/comments directly within the Platform, or contact us at team@xeusar.online to request full deletion of your account and personal profile data.',
      'Objection & Restriction: Object to or request restriction of certain data processing activities where provided by applicable law.',
      'Withdraw Consent: Where processing is based on your consent, you may withdraw that consent at any time without affecting the lawfulness of prior processing.'
    ],
    highlightBox: {
      title: 'Important Security Reminder When Contacting Us',
      text: 'To exercise your privacy rights, email us at team@xeusar.online with only the details necessary to verify and process your request. Never send your password, one-time verification codes, session tokens, or other authentication secrets in an email.',
      tone: 'amber'
    }
  },
  {
    id: 'privacy-3-11',
    number: '3.11',
    shortTitle: "Children's Privacy",
    title: "Children's Privacy",
    paragraphs: [
      'Xeusar is an academic platform designed for high school, college, university, and postgraduate students and learners who meet the minimum age required to consent to online services in their jurisdiction (generally 13 years of age or older, or 16 where applicable under local law).',
      'We do not knowingly collect personal information from children under the applicable minimum age without verifiable parental or guardian consent. If you are a parent or guardian and believe that a child under the required age has registered an account or submitted personal information on Xeusar, please contact us at team@xeusar.online so we can promptly review and remove the information.'
    ]
  },
  {
    id: 'privacy-3-12',
    number: '3.12',
    shortTitle: 'Third-Party Links & Services',
    title: 'Third-Party Links and Services',
    paragraphs: [
      'Study materials, course references, and Community Forum discussions on Xeusar may include links to external websites, educational videos (such as YouTube), code repositories (such as GitHub), or third-party academic articles.',
      'Xeusar does not control and is not responsible for the privacy practices, cookies, security, or content of external websites or services. When you follow a link to a third-party site, your interaction is governed by that third party’s own terms and privacy policy.'
    ]
  },
  {
    id: 'privacy-3-13',
    number: '3.13',
    shortTitle: 'Changes to This Policy',
    title: 'Changes to This Privacy Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time to reflect new Xeusar features, operational improvements, or changes in legal and regulatory requirements.',
      'When we publish changes, we will update the "Last updated" date at the top of this page. Where required by applicable law, we will provide additional notice or obtain your consent before material changes take effect. We encourage you to review this page periodically.'
    ]
  },
  {
    id: 'privacy-3-14',
    number: '3.14',
    shortTitle: 'Contact Us',
    title: 'Contact Us',
    paragraphs: [
      'If you have any questions, concerns, or requests regarding this Privacy Policy, your account data, or our privacy practices, please contact the Xeusar team:',
      'Please include a clear description of your inquiry and the email address or @username associated with your Xeusar account (if applicable). For your protection, never include your password or authentication codes.'
    ],
    isContactSection: true
  }
];

export { XEUSAR_CONTACT_EMAIL, GENERAL_CONTACT_MAILTO };
