import type { TutorSummary } from "@/types/tutor";

/**
 * Sample tutor records for the marketing surfaces.
 *
 * Every field comes from `TutorSummary`, the read model the Phase 4 Supabase
 * queries must satisfy, so replacing this array with a database result requires
 * no component changes. See `./README.md`.
 */

/** A tutor plus the score a matching run would produce for them. */
export interface TutorCardData extends TutorSummary {
  /** 0-100. Produced by the deterministic engine only, never by a language model. */
  matchScore: number;
}

export const featuredTutors: readonly TutorCardData[] = [
  {
    id: "sarah-johnson",
    fullName: "Sarah Johnson",
    headline:
      "Patient WAEC Mathematics specialist with a track record of grade-one passes.",
    bio: "I teach Mathematics the way I wish it had been taught to me: with worked examples, careful checking, and no student left behind.",
    location: "Bodija, Ibadan",
    subjects: ["Mathematics", "Further Mathematics", "Physics"],
    teachingModes: ["in_person", "online"],
    educationLevels: ["jss", "sss", "waec"],
    hourlyRate: 7000,
    yearsOfExperience: 8,
    isVerified: true,
    averageRating: 4.9,
    reviewCount: 47,
    matchScore: 96,
  },
  {
    id: "chinedu-okafor",
    fullName: "Chinedu Okafor",
    headline:
      "Senior Physics and Chemistry tutor for NECO, WAEC and undergraduate students.",
    bio: "Fifteen years in the laboratory, eight in the classroom. I focus on exam technique and the physical intuition behind each formula.",
    location: "Ikeja, Lagos",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    teachingModes: ["online", "hybrid"],
    educationLevels: ["sss", "waec", "neco", "undergraduate"],
    hourlyRate: 9500,
    yearsOfExperience: 6,
    isVerified: true,
    averageRating: 4.8,
    reviewCount: 63,
    matchScore: 91,
  },
  {
    id: "amina-bello",
    fullName: "Amina Bello",
    headline:
      "English language and literature tutor building confident, expressive writers.",
    bio: "Lessons built around your own writing. We fix grammar without flattening your voice, and I mark every essay line by line.",
    location: "Yaba, Lagos",
    subjects: ["English", "Literature-in-English"],
    teachingModes: ["in_person", "online"],
    educationLevels: ["primary", "jss", "sss", "waec"],
    hourlyRate: 6000,
    yearsOfExperience: 5,
    isVerified: true,
    averageRating: 4.9,
    reviewCount: 38,
    matchScore: 88,
  },
];
