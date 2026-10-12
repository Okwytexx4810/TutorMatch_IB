/**
 * The canonical list of approved tutoring locations in Ibadan.
 *
 * This is the single source of truth for location values across the whole
 * application: tutor profile forms, student search filters, server-side
 * validation, database CHECK constraints (see the accompanying migration) and
 * demo seed scripts. Nothing should hard-code a location string anywhere else.
 *
 * The supplied source list contained duplicates and spelling variants; each
 * location appears exactly once here, and the supplied wording "University of
 * Ibada" is corrected to "University of Ibadan".
 */
export const IBADAN_LOCATIONS = [
  "Agodi Gate",
  "Bodija",
  "Iwo Road",
  "Dugbe",
  "Onireke",
  "Mapo",
  "Ring Road",
  "Oluyole Estate",
  "Oke-Ado",
  "Moniya",
  "Egbeda",
  "Ido",
  "Iyana-Offa",
  "Idi-Ayunre",
  "Akanran",
  "Samonda",
  "Agbowo",
  "Orogun",
  "University of Ibadan",
  "Apata",
  "Ganga",
  "Basorun",
  "Agodi GRA",
  "Oke-Bola",
  "Jericho",
  "Iyaganku",
] as const;

export type IbadanLocation = (typeof IBADAN_LOCATIONS)[number];

/** Number of approved locations, exported for tests and UI copy. */
export const IBADAN_LOCATION_COUNT = IBADAN_LOCATIONS.length;

const LOCATION_LOOKUP = new Map(
  IBADAN_LOCATIONS.map((location) => [location.toLowerCase(), location]),
);

/**
 * Whether `value` matches one of the approved locations, ignoring case and
 * surrounding whitespace (delegated to `resolveIbadanLocation`, so the two
 * predicates can never disagree).
 *
 * Used by the Zod schemas that validate server-side input.
 */
export function isIbadanLocation(value: unknown): value is IbadanLocation {
  return resolveIbadanLocation(value) !== null;
}

/**
 * Resolve a free-text location to its canonical spelling, or `null`.
 *
 * Case and surrounding whitespace are ignored, so `"bodija"` resolves to
 * `"Bodija"`. Anything that is not an approved location returns `null` rather
 * than being guessed at. This is what lets legacy or user-typed values be
 * normalised safely without inventing a location that does not exist.
 */
export function resolveIbadanLocation(value: unknown): IbadanLocation | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  return (LOCATION_LOOKUP.get(key) as IbadanLocation | undefined) ?? null;
}
