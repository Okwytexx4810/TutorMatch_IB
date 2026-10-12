/**
 * Canonical subject vocabulary.
 *
 * One list shared by the tutor profile form, the discovery subject filter and
 * any other subject picker, so the options a tutor can choose from and the
 * options a student can search on can never drift apart. The database stores
 * subjects as free text (`tutor_subjects.subject`); this list is the curated
 * set the UI offers, while still accepting a tutor's existing custom subjects.
 */
export const SUBJECTS = [
  "Mathematics",
  "Further Mathematics",
  "English",
  "Literature in English",
  "Biology",
  "Chemistry",
  "Physics",
  "Agricultural Science",
  "Basic Science",
  "Basic Technology",
  "Economics",
  "Government",
  "Commerce",
  "Financial Accounting",
  "Geography",
  "History",
  "Civic Education",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "Social Studies",
  "Computer Science",
  "Information and Communication Technology",
  "Business Studies",
  "Home Economics",
  "Fine Arts",
  "Music",
  "Yoruba",
  "French",
  "Verbal Reasoning",
  "Quantitative Reasoning",
  "Phonics",
  "Handwriting",
] as const;

export type Subject = (typeof SUBJECTS)[number];

/** Longest subject label we accept, mirroring the request schema's bound. */
export const SUBJECT_MAX = 120;
