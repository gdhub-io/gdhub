// Vacancy listing configuration shared by API routes and UI.
// Keep this the single source of truth — do not redefine these constants inline.

/**
 * A paid listing is valid for at most this many days from its publication.
 * Anchoring the cap to the (set-once) publish date stops a single payment from
 * being extended forever by repeatedly editing the finish date.
 */
export const LISTING_WINDOW_DAYS = 90;

/** Fallback listing length used when restoring a vacancy whose window has lapsed. */
export const DEFAULT_FINISH_DAYS = 30;
