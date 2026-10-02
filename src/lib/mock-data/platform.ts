/**
 * Sample platform figures for the landing page.
 *
 * These are illustrative preview numbers, not measured metrics. The section that
 * renders them must carry `platformStatsDisclosure` so a visitor is never misled.
 * See `./README.md`.
 */

export interface PlatformStat {
  id: string;
  label: string;
  value: string;
  /** One short clause on what the figure represents. */
  description: string;
}

export const platformStats: readonly PlatformStat[] = [
  {
    id: "tutors",
    label: "Tutors",
    value: "2,000+",
    description: "Vetted across subjects and teaching modes",
  },
  {
    id: "students",
    label: "Students",
    value: "5,000+",
    description: "Learners and parents searching each term",
  },
  {
    id: "subjects",
    label: "Subjects",
    value: "20+",
    description: "From primary Mathematics to undergraduate Physics",
  },
  {
    id: "rating",
    label: "Average rating",
    value: "4.8/5",
    description: "Average of post-session reviews",
  },
];

/** Rendered next to the figures so the numbers are not read as live metrics. */
export const platformStatsDisclosure =
  "Preview figures shown to illustrate the product. Live counts appear after launch.";
