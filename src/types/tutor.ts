/**
 * The tutor record shape the matching engine and tutor UI consume.
 *
 * This is the read model, not the database schema. The Supabase tables are
 * introduced in Phase 4; this type is the contract those queries must satisfy
 * so the matching engine stays deterministic and database-agnostic.
 */
import type { DayPeriod, EducationLevel, TeachingMode, WeekDay } from "./domain";

export interface TutorAvailabilitySlot {
  day: WeekDay;
  period: DayPeriod;
  /** Session start time in 24h `HH:mm`, when the tutor pins an exact time. */
  startTime?: string;
  /** Whether the tutor is currently accepting new students in this slot. */
  isActive: boolean;
}

export interface TutorQualification {
  id: string;
  title: string;
  institution?: string;
  year?: number;
}

export interface TutorSummary {
  id: string;
  fullName: string;
  avatarUrl?: string;
  headline?: string;
  bio?: string;
  location?: string;
  subjects: string[];
  teachingModes: TeachingMode[];
  educationLevels: EducationLevel[];
  /** Price per one hour of tutoring, in kobo-free whole naira. */
  hourlyRate: number;
  yearsOfExperience: number;
  isVerified: boolean;
  averageRating: number | null;
  reviewCount: number;
}

export interface TutorProfile extends TutorSummary {
  qualifications: TutorQualification[];
  availability: TutorAvailabilitySlot[];
}
