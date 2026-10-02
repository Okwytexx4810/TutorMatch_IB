# Mock data

Temporary sample content for the marketing surfaces, so the landing page can be
built and reviewed before Supabase exists.

**This directory is deleted in Phase 4.** Every consumer is typed against
`TutorSummary` from `@/types/tutor`, which is the read model the real Supabase
queries must satisfy. When the database lands, the only change is swapping the
import of `featuredTutors` for a query result — no component edits.

Nothing in here is real data, and no component may present it as verified.
Sections that render mock values must label them as a preview.
