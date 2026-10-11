# `lib/openai`

Server-only integration with the OpenAI Responses API.

## Non-negotiable boundary

OpenAI performs **natural language understanding only**. It extracts the
student's requirements into the structured shape defined in
`src/types/domain.ts` and, optionally, explains the result in plain language.

OpenAI must **never** produce or confirm any of the following:

- tutor availability
- tutor prices or rates
- tutor ratings or review counts
- tutor locations
- tutor qualifications
- match scores or percentages

Those facts come from PostgreSQL via `lib/supabase`, and compatibility is
calculated by `lib/matching`. This keeps results factual, auditable and
reproducible.

## Planned modules

| Module                | Purpose                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| `client.ts`           | Lazily constructed `OpenAI` client from `serverEnv().OPENAI_API_KEY`.       |
| `schemas.ts`          | Zod schemas describing the structured output the model must produce.        |
| `extract-requirements.ts` | The extraction prompt and the `responses.parse` call.                  |

## Planned extraction output

```jsonc
{
  "subject": "Mathematics",
  "level": "waec",
  "location": "Bodija",
  "availability": [
    { "day": "tuesday", "period": "evening" },
    { "day": "thursday", "period": "evening" }
  ],
  "budget": 7000,
  "teachingMode": "in_person",
  "minExperienceYears": 0,
  "notes": "Prefers a patient tutor; daughter is preparing for WAEC."
}
```

The call site must also validate the model output against
`lib/validation/matching-requirements.ts` before it reaches the matching engine.
