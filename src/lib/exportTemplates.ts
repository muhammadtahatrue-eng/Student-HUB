export interface ExportFile {
  path: string;
  language: string;
  description: string;
  code: string;
}

export const NEXTJS_EXPORT_FILES: ExportFile[] = [
  {
    path: 'supabase/schema.sql',
    language: 'sql',
    description: 'PostgreSQL Database Schema, Row-Level Security (RLS) policies, Storage bucket configuration, and Realtime publications.',
    code: `-- ==============================================================================
-- STUDYVAULT SUPABASE DATABASE SCHEMA & SECURITY RULES
-- Run this in your Supabase Project -> SQL Editor -> New Query
-- ==============================================================================

-- 1. Create study_notes Table
create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  course_code text not null,
  course_name text not null,
  subject text not null,
  material_type text not null check (
    material_type in ('lecture_notes', 'past_exam', 'cheat_sheet', 'lab_manual', 'summary')
  ),
  academic_year integer not null default extract(year from current_date),
  semester text default 'Fall Semester',
  professor text,
  file_url text not null,
  file_name text not null,
  file_size_bytes bigint not null default 0,
  page_count integer not null default 1,
  uploader_name text not null default 'Anonymous Student',
  uploader_university text default 'Open Campus',
  uploader_id uuid references auth.users(id) on delete set null,
  downloads_count integer not null default 0,
  upvotes_count integer not null default 0,
  tags text[] default array[]::text[],
  pages jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Performance Indexes for Fast Search & Filtering
create index if not exists idx_study_notes_course_code on public.study_notes(course_code);
create index if not exists idx_study_notes_subject on public.study_notes(subject);
create index if not exists idx_study_notes_material_type on public.study_notes(material_type);
create index if not exists idx_study_notes_created_at on public.study_notes(created_at desc);

-- Full-text search index for title and description
create index if not exists idx_study_notes_fts on public.study_notes using gin (
  to_tsvector('english', title || ' ' || coalesce(description, '') || ' ' || course_code || ' ' || subject)
);

-- 3. Enable Row Level Security (RLS)
alter table public.study_notes enable row level security;

-- Policy A: Everyone (authenticated & unauthenticated) can browse and view study notes
create policy "Anyone can read study notes"
  on public.study_notes
  for select
  using (true);

-- Policy B: Anyone (or authenticated students) can upload study materials
create policy "Anyone can upload study notes"
  on public.study_notes
  for insert
  with check (true);

-- Policy C: Allow download and upvote counter increment via RPC or safe update
create policy "Allow students to update upvotes and download counts"
  on public.study_notes
  for update
  using (true)
  with check (true);

-- 4. Enable Supabase Realtime for instant synchronization
alter publication supabase_realtime add table public.study_notes;

-- 5. Set up Storage Bucket for PDF Files
-- Create the 'study-materials' public bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-materials',
  'study-materials',
  true,
  26214400, -- 25 MB limit
  array['application/pdf']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = array['application/pdf'];

-- Storage RLS Policies
create policy "Public Access: Anyone can view and download PDFs"
  on storage.objects for select
  using ( bucket_id = 'study-materials' );

create policy "Public Access: Anyone can upload study PDFs"
  on storage.objects for insert
  with check ( bucket_id = 'study-materials' );

-- 6. Helper RPC Function to increment counters safely
create or replace function public.increment_downloads(note_id uuid)
returns void as $$
begin
  update public.study_notes
  set downloads_count = downloads_count + 1
  where id = note_id;
end;
$$ language plpgsql security definer;
`
  },
  {
    path: '.env.local.example',
    language: 'bash',
    description: 'Supabase environment configuration variables for Next.js.',
    code: `# Get these values from your Supabase Dashboard -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
`
  },
  {
    path: 'lib/supabase.ts',
    language: 'typescript',
    description: 'Browser-side and Server-side Supabase client initialization.',
    code: `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface StudyNoteRow {
  id: string;
  title: string;
  description: string;
  course_code: string;
  course_name: string;
  subject: string;
  material_type: 'lecture_notes' | 'past_exam' | 'cheat_sheet' | 'lab_manual' | 'summary';
  academic_year: number;
  semester: string;
  professor?: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  page_count: number;
  uploader_name: string;
  uploader_university?: string;
  downloads_count: number;
  upvotes_count: number;
  tags?: string[];
  created_at: string;
}
`
  },
  {
    path: 'app/layout.tsx',
    language: 'typescript',
    description: 'Next.js 15 root layout with metadata, navbar, and typography.',
    code: `import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'StudyVault — Free Student Study-Material Sharing Platform',
  description: 'Discover, download, and share peer-reviewed lecture notes, past exam papers, and high-yield cheat sheets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="bg-stone-50 text-stone-900 font-sans antialiased min-h-screen flex flex-col">
        {/* Top Bar Contract: 3-Zone Navigation */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Zone 1: Single text element wordmark */}
            <Link href="/" className="text-xl font-bold tracking-tight text-stone-900">
              StudyVault
            </Link>

            {/* Zone 2: Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
              <Link href="/" className="hover:text-stone-900 transition-colors">
                Browse Notes
              </Link>
              <Link href="/upload" className="hover:text-stone-900 transition-colors">
                Share Material
              </Link>
              <a href="#how-it-works" className="hover:text-stone-900 transition-colors">
                How It Works
              </a>
            </nav>

            {/* Zone 3: Primary Action */}
            <div className="flex items-center gap-3">
              <Link
                href="/upload"
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-900 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shadow-sm"
              >
                + Upload PDF
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-stone-200 bg-white py-8 text-center text-xs text-stone-500">
          <p>© {new Date().getFullYear()} StudyVault · Free & open academic material platform for students.</p>
        </footer>
      </body>
    </html>
  );
}
`
  },
  {
    path: 'app/page.tsx',
    language: 'typescript',
    description: 'Next.js homepage with search bar, material filters, and realtime note stream.',
    code: `'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, StudyNoteRow } from '@/lib/supabase';

const MATERIAL_TYPES = [
  { id: 'all', label: 'All Materials' },
  { id: 'lecture_notes', label: 'Lecture Notes' },
  { id: 'past_exam', label: 'Past Exams' },
  { id: 'cheat_sheet', label: 'Cheat Sheets' },
  { id: 'summary', label: 'Summaries' },
  { id: 'lab_manual', label: 'Lab Manuals' },
];

export default function HomePage() {
  const [notes, setNotes] = useState<StudyNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchNotes();

    // Set up Realtime listener
    const channel = supabase
      .channel('realtime_notes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'study_notes' },
        (payload) => {
          setNotes((prev) => [payload.new as StudyNoteRow, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchNotes() {
    setLoading(true);
    let query = supabase.from('study_notes').select('*').order('created_at', { ascending: false });
    const { data, error } = await query;
    if (!error && data) {
      setNotes(data);
    }
    setLoading(false);
  }

  const filtered = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.course_code.toLowerCase().includes(search.toLowerCase()) ||
      n.subject.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || n.material_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero & Search Header */}
      <section className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 mb-3 text-balance">
          University Study Materials, Verified & Free
        </h1>
        <p className="text-stone-600 text-sm sm:text-base mb-6">
          Search course codes, midterms, lecture summaries, and formula sheets shared by peers.
        </p>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course code (e.g. CS106B, MATH21A), topic, or title..."
            className="w-full px-4 py-3 pl-11 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent shadow-sm"
          />
          <svg
            className="w-5 h-5 text-stone-400 absolute left-3.5 top-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </section>

      {/* Filter Tabs (Interactive Segmented Buttons) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-stone-200">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-200/60 rounded-lg">
          {MATERIAL_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={\`px-3 py-1.5 text-xs font-medium rounded-md transition-colors \${
                typeFilter === t.id
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }\`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-stone-500 tabular-nums">
          Showing {filtered.length} resources
        </span>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-stone-200/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-200 p-8">
          <p className="text-stone-600 font-medium mb-2">No study materials found</p>
          <p className="text-xs text-stone-500 mb-4">Be the first to share notes for this course!</p>
          <Link
            href="/upload"
            className="inline-block px-4 py-2 text-xs font-semibold text-white bg-indigo-900 rounded-lg hover:bg-indigo-800"
          >
            Upload Notes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((note) => (
            <article
              key={note.id}
              className="bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-400 transition-colors flex flex-col justify-between"
            >
              <div>
                {/* Clean unboxed metadata with typographic separators */}
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-900 mb-2">
                  <span>{note.course_code}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-stone-500">{note.subject}</span>
                </div>

                <h3 className="font-semibold text-stone-900 text-base leading-snug mb-2 line-clamp-2">
                  {note.title}
                </h3>
                <p className="text-xs text-stone-600 line-clamp-3 mb-4 leading-relaxed">
                  {note.description}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
                  <span className="tabular-nums">{note.page_count} pages</span>
                  <span>{note.uploader_name}</span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 text-center text-xs font-semibold text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
`
  },
  {
    path: 'app/upload/page.tsx',
    language: 'typescript',
    description: 'Next.js upload page handling PDF drag-and-drop, Supabase storage bucket upload, and database insert.',
    code: `'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [materialType, setMaterialType] = useState('lecture_notes');
  const [description, setDescription] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== 'application/pdf') {
        setError('Only PDF files are supported.');
        return;
      }
      if (selected.size > 25 * 1024 * 1024) {
        setError('File size must be less than 25MB.');
        return;
      }
      setError(null);
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\\.pdf$/i, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file to upload.');
      return;
    }
    if (!title || !courseCode) {
      setError('Title and Course Code are required.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // 1. Upload PDF into Supabase Storage Bucket 'study-materials'
      const fileExt = 'pdf';
      const cleanFileName = \`\${Date.now()}_\${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}\`;
      const filePath = \`uploads/\${cleanFileName}\`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('study-materials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf',
        });

      if (storageError) {
        throw new Error(\`Storage error: \${storageError.message}\`);
      }

      // 2. Retrieve Public URL for the uploaded PDF
      const { data: urlData } = supabase.storage
        .from('study-materials')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. Insert metadata record into 'study_notes' Postgres table
      const { error: dbError } = await supabase.from('study_notes').insert([
        {
          title,
          description,
          course_code: courseCode.trim().toUpperCase(),
          course_name: courseName || courseCode.trim().toUpperCase(),
          subject,
          material_type: materialType,
          academic_year: new Date().getFullYear(),
          file_url: publicUrl,
          file_name: file.name,
          file_size_bytes: file.size,
          page_count: 12, // Estimate or computed via pdf-lib
          uploader_name: uploaderName.trim() || 'Anonymous Student',
          downloads_count: 0,
          upvotes_count: 0,
        },
      ]);

      if (dbError) {
        throw new Error(\`Database error: \${dbError.message}\`);
      }

      // 4. Redirect to home feed
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to upload note.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">Share Study Material</h1>
        <p className="text-xs text-stone-500 mb-6">
          Upload PDF notes, exam solutions, or course summaries for fellow students.
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              PDF Document
            </label>
            <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center hover:border-indigo-600 transition-colors bg-stone-50/50">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <svg
                  className="w-8 h-8 text-stone-400 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-sm font-medium text-stone-800">
                  {file ? file.name : 'Click to select or drag PDF file here'}
                </span>
                <p className="text-xs text-stone-400 mt-1">PDF format up to 25MB</p>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CS 106B, MATH 21A"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Economics">Economics</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Binary Search Trees & Graph Algorithms Complete Notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Material Type
              </label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="lecture_notes">Lecture Notes</option>
                <option value="past_exam">Past Exam</option>
                <option value="cheat_sheet">Cheat Sheet</option>
                <option value="summary">Summary</option>
                <option value="lab_manual">Lab Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Your Name / Alias
              </label>
              <input
                type="text"
                placeholder="e.g. Alex T."
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description & Key Topics
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of chapters or problems covered..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
          >
            {uploading ? 'Uploading to Supabase...' : 'Publish Study Material'}
          </button>
        </form>
      </div>
    </div>
  );
}
`
  }
];
