export const XEUSAR_CONTACT_EMAIL = 'team@xeusar.online';
export const COPYRIGHT_REPORT_SUBJECT = 'Copyright Removal Request';
export const COPYRIGHT_REPORT_MAILTO = `mailto:${XEUSAR_CONTACT_EMAIL}?subject=${encodeURIComponent(
  COPYRIGHT_REPORT_SUBJECT
)}`;
export const GENERAL_CONTACT_MAILTO = `mailto:${XEUSAR_CONTACT_EMAIL}`;

export type InfoCenterSectionId =
  | 'about'
  | 'faq'
  | 'terms'
  | 'copyright'
  | 'contact';

export interface InfoOfferingItem {
  title: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  hasCopyrightMailto?: boolean;
  hasGeneralMailto?: boolean;
}

export interface TermsSectionItem {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  bulletIntro?: string;
  orderedList?: string[];
  highlightText?: string;
  afterListParagraphs?: string[];
  isCopyrightReportingSection?: boolean;
  isContactSection?: boolean;
}

export const ABOUT_XEUSAR_CONTENT = {
  title: 'About Xeusar',
  subtitle: 'Your Learning. Your Community. Your Future.',
  introParagraphs: [
    'Xeusar is a free educational platform designed to help students discover, access, and share academic resources in one place.',
    'Our mission is to make learning resources more accessible, encourage academic collaboration, and help students connect with useful study materials and educational communities.',
    "Students can use Xeusar's available features according to the platform's access policies. Making the platform available for free does not mean its software source code is open source.",
    'Xeusar is a privately developed platform. Its source code is not being offered for public reuse under an open-source license.'
  ],
  missionTitle: 'Our Mission',
  missionText:
    'Our mission is to make learning resources more accessible, encourage academic collaboration, and help students connect with useful study materials and educational communities in one platform.',
  offeringsTitle: 'What Xeusar Offers',
  offerings: [
    {
      title: 'Study Library',
      description:
        'Discover, organize, and access academic study materials. Xeusar aims to make learning resources easier to find and more useful for students.'
    },
    {
      title: 'Academic Programs',
      description:
        'Explore academic programs and organize learning around educational goals, degree programs, and areas of study.'
    },
    {
      title: 'Community Forum',
      description:
        'Ask questions, share ideas, discuss academic topics, and learn from other members of the student community.'
    },
    {
      title: 'Student Collaboration',
      description:
        'Connect learning resources with discussions and help students exchange knowledge in a structured academic environment.'
    }
  ] as InfoOfferingItem[],
  visionTitle: 'Our Vision',
  visionText:
    'We envision a learning community where students spend less time searching for scattered resources and more time understanding, practicing, and applying what they learn.',
  commitmentTitle: 'Our Commitment',
  commitmentParagraphs: [
    'We are committed to improving the learning experience through thoughtful design, useful academic tools, responsible community participation, and continuous development.',
    'Xeusar is an independent learning platform. Unless explicitly stated otherwise, it is not affiliated with or officially endorsed by any university, school, examination board, or educational institution.'
  ],
  getInTouchTitle: 'Get in Touch',
  getInTouchPrompt: 'Have a question, suggestion, or idea to improve Xeusar?',
  getInTouchClosing:
    'We welcome feedback that helps us build a better academic experience for everyone.'
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'q1',
    question: 'Q1. What is Xeusar?',
    answer:
      'Xeusar is an academic platform that brings study resources, academic programs, and student discussions together in one place.'
  },
  {
    id: 'q2',
    question: 'Q2. Who can use Xeusar?',
    answer:
      "Students and other learners can use Xeusar for academic organization, learning resources, and educational discussions, subject to the platform's eligibility and account requirements."
  },
  {
    id: 'q3',
    question: 'Q3. How do I create an account?',
    answer:
      'Use the registration option on the website and provide the requested information. If email verification is required, follow the confirmation link sent to your email before accessing protected account features.'
  },
  {
    id: 'q4',
    question: 'Q4. What is the Study Library?',
    answer:
      'The Study Library helps members discover and organize academic materials. Available resources and features may depend on the current platform implementation.'
  },
  {
    id: 'q5',
    question: 'Q5. Can I upload or share study materials?',
    answer:
      'If uploading or sharing is enabled for your account, you may contribute materials you own, have permission to distribute, or are otherwise legally allowed to share. Unauthorized distribution of copyrighted material is not permitted.'
  },
  {
    id: 'q6',
    question: 'Q6. What is the Community Forum?',
    answer:
      'The Community Forum allows members to ask academic questions, discuss topics, and exchange knowledge. Members are expected to communicate respectfully and follow platform rules.'
  },
  {
    id: 'q7',
    question: 'Q7. Is Xeusar affiliated with my university?',
    answer:
      'Xeusar is an independent platform unless a specific institutional partnership is explicitly announced. University names and academic references do not automatically imply endorsement.'
  },
  {
    id: 'q8',
    question: 'Q8. Is all information on Xeusar guaranteed to be correct?',
    answer:
      "No. Learning materials and user contributions may contain errors. Verify important academic information against reliable sources and your instructors' guidance."
  },
  {
    id: 'q9',
    question: 'Q9. What should I do if someone shares my copyrighted material?',
    answer:
      'Email team@xeusar.online with the subject line Copyright Removal Request. Include the link to the material, identify the original copyrighted work, and explain why you believe the material was shared without authorization.',
    hasCopyrightMailto: true
  },
  {
    id: 'q10',
    question: 'Q10. How can I report inappropriate content?',
    answer:
      'Contact team@xeusar.online and include a link to the relevant content, a description of the issue, and any information necessary to help us review the report.',
    hasGeneralMailto: true
  },
  {
    id: 'q11',
    question: 'Q11. How can I suggest a new feature?',
    answer: 'Send your ideas and suggestions to team@xeusar.online.',
    hasGeneralMailto: true
  },
  {
    id: 'q12',
    question: 'Q12. How can I ask about my account or privacy?',
    answer:
      'Contact team@xeusar.online. Include only the information necessary to explain your request. Never send your password, verification codes, or other authentication secrets.',
    hasGeneralMailto: true
  }
];

export const TERMS_AND_CONDITIONS_META = {
  pageTitle: 'Terms & Conditions',
  lastUpdated: 'November 3, 2026'
};

export const TERMS_SECTIONS: TermsSectionItem[] = [
  {
    id: 'terms-3-1',
    number: '3.1',
    title: 'Introduction',
    paragraphs: [
      'Welcome to Xeusar ("we," "our," "us," or the "Platform").',
      'These Terms & Conditions govern your access to and use of the Xeusar website, Study Library, academic program features, community forum, and related services.',
      'By accessing or using Xeusar, you agree to these terms. If you do not agree, please discontinue use of the platform.'
    ]
  },
  {
    id: 'terms-3-2',
    number: '3.2',
    title: 'Eligibility and Accounts',
    paragraphs: [
      'You must meet applicable age requirements and have the legal capacity required to use the platform in your jurisdiction.'
    ],
    bulletIntro: 'You agree to:',
    bullets: [
      'Provide accurate information when creating an account.',
      'Keep your login credentials confidential.',
      'Use an email address you are authorized to access.',
      'Keep your account information reasonably up to date.',
      'Notify us if you suspect unauthorized access to your account.'
    ],
    afterListParagraphs: [
      'You are responsible for activity conducted through your account, except where applicable law provides otherwise.',
      'We may require email verification before granting access to protected features. Accounts may be restricted or suspended when reasonably necessary to protect users, platform security, or services.'
    ]
  },
  {
    id: 'terms-3-3',
    number: '3.3',
    title: 'Acceptable Use',
    paragraphs: ['Xeusar is intended for lawful educational and community purposes.'],
    bulletIntro: 'Users must not:',
    bullets: [
      'Harass, threaten, bully, or impersonate other people.',
      'Post unlawful, abusive, discriminatory, or deliberately misleading content.',
      'Upload malicious software or attempt to compromise platform security.',
      "Attempt to access another user's account, private data, or restricted resources without authorization.",
      'Spam users, manipulate votes, or abuse community features.',
      'Disrupt the platform or attempt unauthorized access.',
      "Violate another person's privacy or intellectual property rights.",
      'Use Xeusar to facilitate unlawful activities.'
    ]
  },
  {
    id: 'terms-3-4',
    number: '3.4',
    title: 'User-Uploaded Content and Copyright',
    paragraphs: [
      'Xeusar supports an open and collaborative academic learning environment where users may contribute study materials, notes, documents, links, and other educational resources.',
      'Because content may be submitted by users, Xeusar cannot guarantee that every submitted resource has been independently reviewed for copyright ownership or authorization before becoming available.'
    ],
    highlightText:
      'Users are responsible for ensuring that they have the necessary rights, permission, or other lawful basis to upload, distribute, or share content.',
    afterListParagraphs: [
      'Users must not upload or distribute copyrighted textbooks, paid educational resources, unauthorized copies, or other protected content without the required authorization, unless an applicable legal exception permits that use.',
      'Xeusar does not intend to encourage, authorize, or facilitate copyright infringement.',
      'We may investigate reports of potentially infringing material and, where appropriate, remove, restrict access to, or disable access to reported content. We may also take reasonable action against repeat violations, subject to applicable law and our operational capabilities.',
      'Nothing in these terms should be interpreted as a blanket exemption from any legal responsibility that may apply to Xeusar.'
    ]
  },
  {
    id: 'terms-3-5',
    number: '3.5',
    title: 'Copyright Complaints and Removal Requests',
    paragraphs: [
      'Copyright owners and their authorized representatives may report material they believe infringes their rights.'
    ],
    bulletIntro: 'Please provide the following information where applicable:',
    orderedList: [
      'Identification of the copyrighted work you believe has been infringed.',
      'The URL or a clear description of the allegedly infringing material on Xeusar.',
      'Your name and contact information.',
      'An explanation of your ownership or authority to act on behalf of the rights holder.',
      'A statement explaining why you believe the material is unauthorized.',
      'Any additional information reasonably necessary to review the complaint.'
    ],
    afterListParagraphs: [
      'Please provide accurate information and submit complaints in good faith.',
      'We may request additional information to verify a complaint. We will review sufficiently detailed reports and take appropriate action based on the circumstances, our policies, and applicable law.',
      'Where appropriate, we may restrict or remove reported content, notify the uploader, or take further action under our policies.',
      'Submitting a report does not guarantee immediate removal. We will assess reports reasonably and handle them in accordance with applicable legal requirements.'
    ],
    isCopyrightReportingSection: true
  },
  {
    id: 'terms-3-6',
    number: '3.6',
    title: 'Content Ownership and Platform Permission',
    paragraphs: [
      'Users retain the rights they hold in content they create and submit, subject to any rights already belonging to others.',
      'By submitting content, users grant Xeusar permission to host, store, reproduce, and display that content as reasonably necessary to operate, maintain, and provide the features through which the content is submitted or shared.',
      "This permission is limited to those purposes and any additional uses expressly authorized by the user. It does not transfer ownership of the user's intellectual property to Xeusar.",
      'Users must not submit content they have no right to share.',
      'Xeusar-owned branding, original interface elements, and platform materials may not be reused in ways that infringe applicable rights or mislead others.'
    ]
  },
  {
    id: 'terms-3-7',
    number: '3.7',
    title: 'Free Educational Platform and Proprietary Software',
    paragraphs: [
      "Xeusar is a free educational platform and study resource directory designed to help students discover, access, and share academic resources in one place. Students can use Xeusar's available features according to the platform's access policies.",
      'Making the platform available for free does not mean its software source code is open source. Xeusar is a privately developed platform, and its source code is not being offered for public reuse under an open-source license.',
      'Similarly, free access to the platform does not make user-uploaded textbooks, documents, images, or other third-party materials free of copyright restrictions or free to redistribute without authorization. Users must obtain any required rights or permission to share third-party content.'
    ]
  },
  {
    id: 'terms-3-8',
    number: '3.8',
    title: 'Community Contributions',
    paragraphs: [
      "Forum posts, comments, study notes, and other member contributions represent their respective authors' views and are not necessarily endorsed by Xeusar.",
      'Users are responsible for their contributions. We may moderate, hide, or remove content that violates these terms, applicable law, or community rules.',
      'Users must not share passwords, authentication codes, private personal information, or confidential records belonging to themselves or others.'
    ]
  },
  {
    id: 'terms-3-9',
    number: '3.9',
    title: 'Academic Information Disclaimer',
    paragraphs: [
      'Xeusar provides tools and resources intended to support learning.',
      'We do not guarantee that every resource, answer, discussion, or user contribution is accurate, complete, current, or suitable for a particular course or examination.',
      'The platform is not a substitute for official course materials, qualified instruction, or institutional guidance. Users should independently verify important academic information.',
      'Unless explicitly stated otherwise, Xeusar does not represent or act on behalf of any university, school, examination board, or educational institution.'
    ]
  },
  {
    id: 'terms-3-10',
    number: '3.10',
    title: 'Availability and Changes',
    paragraphs: [
      'We aim to keep Xeusar useful and available, but uninterrupted access is not guaranteed.',
      'Features may be updated, temporarily unavailable, changed, or discontinued. We may introduce reasonable usage limits and technical safeguards to protect security, service performance, and fair access.'
    ]
  },
  {
    id: 'terms-3-11',
    number: '3.11',
    title: 'Privacy and Security',
    paragraphs: [
      'Our handling of personal information is explained in our dedicated Privacy Policy.',
      'Users should review the Privacy Policy to understand what information is collected, how it is used and stored, which third-party infrastructure providers we use (Supabase, Cloudflare, and Resend), and what choices or rights are available.',
      'We take reasonable measures to protect the platform, but no internet service can guarantee absolute security.'
    ]
  },
  {
    id: 'terms-3-12',
    number: '3.12',
    title: 'Suspension and Termination',
    paragraphs: [
      'Users may stop using Xeusar at any time.',
      'We may restrict, suspend, or terminate access when necessary to address violations of these terms, security risks, abuse, legal obligations, or operational requirements.',
      'Where appropriate, we will seek to provide notice or an opportunity to resolve the issue.',
      'Handling of account data after termination remains subject to our Privacy Policy and applicable law.'
    ]
  },
  {
    id: 'terms-3-13',
    number: '3.13',
    title: 'Third-Party Services',
    paragraphs: [
      'Xeusar may rely on third-party services for hosting, authentication, email delivery, storage, and other functionality.',
      'Those services may be governed by their own terms and privacy policies. This section does not exclude responsibilities imposed on Xeusar by applicable law.'
    ]
  },
  {
    id: 'terms-3-14',
    number: '3.14',
    title: 'Limitation of Liability',
    paragraphs: [
      'To the extent permitted by applicable law, Xeusar is provided on an "as available" basis without a guarantee that every feature will be uninterrupted, error-free, or suitable for every purpose.',
      'Nothing in these terms excludes or limits liability where such exclusion or limitation is prohibited by law.',
      'Any permitted limitation applies only to the extent allowed by applicable law.'
    ]
  },
  {
    id: 'terms-3-15',
    number: '3.15',
    title: 'Changes to These Terms',
    paragraphs: [
      'We may update these Terms & Conditions as Xeusar evolves.',
      'The revised version will be published on this page with an updated revision date. Where required by law, we will provide notice or obtain consent before material changes take effect.'
    ]
  },
  {
    id: 'terms-3-16',
    number: '3.16',
    title: 'Governing Law',
    paragraphs: [
      'These terms are subject to applicable laws and mandatory legal protections. Any governing-law or dispute-resolution provisions must be consistent with applicable legal requirements.'
    ]
  },
  {
    id: 'terms-3-17',
    number: '3.17',
    title: 'Contact',
    paragraphs: [
      'For questions about these terms, copyright concerns, account issues, or other platform matters:',
      'Do not include passwords, verification codes, or unnecessary sensitive information in your message.'
    ],
    isContactSection: true
  }
];

export const UPLOAD_COPYRIGHT_NOTICE = {
  label: 'Copyright Notice:',
  text: 'Only upload materials you own, have permission to share, or are legally allowed to distribute. Unauthorized sharing of copyrighted books, paid resources, or other protected content is not permitted. Copyright concerns? Contact team@xeusar.online.',
  acknowledgmentLabel:
    'I confirm that I have the necessary rights or permission to share this material.'
};

export const COPYRIGHT_REPORTING_CHECKLIST = [
  'Identification of the copyrighted work you believe has been infringed.',
  'The URL or a clear description of the allegedly infringing material on Xeusar.',
  'Your name and contact information.',
  'An explanation of your ownership or authority to act on behalf of the rights holder.',
  'A statement explaining why you believe the material is unauthorized.',
  'Any additional information reasonably necessary to review the complaint.'
];
