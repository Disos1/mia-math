/**
 * Diagnostic engine thresholds — named constants, never hardcoded inline.
 * Adjust here; the engine reads from this file.
 */

/** Multiplication fact retrieval cutoff (ms).
 *  Correct answer above this threshold → ERR_MULT_FACT_SLOW (computes rather than retrieves). */
export const MULT_FACT_RETRIEVAL_THRESHOLD_MS = 3000;

/** Soft time cap for the full diagnostic (ms).
 *  If elapsed time exceeds this when Phase 2 starts, Phase 2 is compressed to
 *  however many items have sufficient confidence already accumulated. */
export const DIAGNOSTIC_SOFT_CAP_MS = 15 * 60 * 1000; // 15 minutes

/** Re-diagnostic triggers (either condition fires it, whichever comes first). */
export const REDIAG_SESSION_THRESHOLD = 10;   // sessions since last diagnostic
export const REDIAG_DAY_THRESHOLD     = 7;    // days since last diagnostic

/** Mastery thresholds */
export const MASTERY_ACCURACY_THRESHOLD = 0.80; // 80% first-attempt accuracy
export const MASTERY_ITEM_MINIMUM       = 10;   // min items in the rolling window
export const MASTERY_SESSION_MINIMUM    = 2;    // min sessions spanning those items

/** Retention probe windows (days after mastery) */
export const RETENTION_PROBE_SHORT_DAYS  = 7;
export const RETENTION_PROBE_LONG_DAYS   = 30;
export const RETENTION_DEMOTION_ACCURACY = 0.70; // drop below this → skill re-enters practice
