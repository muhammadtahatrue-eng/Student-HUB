import { StudyNote } from '../types/index.ts';

// Real user-uploaded or Supabase-synced study materials (hardcoded dummy notes removed)
export const INITIAL_STUDY_NOTES: StudyNote[] = [];

export const SUBJECT_OPTIONS = [
  'All Subjects',
  'Computer Science',
  'Mathematics',
  'Biology',
  'Physics',
  'Chemistry',
  'Economics',
  'Engineering',
  'Psychology',
  'History',
  'Philosophy'
];

export const MATERIAL_TYPE_LABELS: Record<string, { label: string; short: string }> = {
  all: { label: 'All Resources', short: 'All' },
  lecture_notes: { label: 'Lecture Notes', short: 'Lectures' },
  past_exam: { label: 'Past Exams', short: 'Exams' },
  cheat_sheet: { label: 'Cheat Sheets', short: 'Cheats' },
  summary: { label: 'Summaries', short: 'Summaries' },
  lab_manual: { label: 'Lab Manuals', short: 'Labs' }
};
