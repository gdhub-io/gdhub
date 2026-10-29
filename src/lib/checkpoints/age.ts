import { CHECKPOINT_MIN_AGE } from "@/config/checkpoint";

/**
 * Below the age a Checkpoint is sold at, judged by year of birth as onboarding
 * asks it. A year cannot tell 17 from 18 near a birthday; the buyer's own "I am
 * 18 or over" in the Purchase Terms tick covers that.
 */
export const underCheckpointAge = (
	yearOfBirth: number | null | undefined,
	now: Date = new Date(),
) => !yearOfBirth || now.getUTCFullYear() - yearOfBirth < CHECKPOINT_MIN_AGE;
