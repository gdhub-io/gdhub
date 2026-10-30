import {
	CURATOR_LENS_WEIGHTS,
	CURATOR_LENSES,
	type CuratorLens,
	type LensWeight,
} from "@/config/checkpoint";

/** Every lens's weight on a stage (GDHUB-126); a stage or lens the config does not name is normal. */
export const lensWeights = (stage: string): Record<CuratorLens, LensWeight> =>
	Object.fromEntries(
		CURATOR_LENSES.map((lens) => [
			lens,
			CURATOR_LENS_WEIGHTS[stage]?.[lens] ?? "normal",
		]),
	) as Record<CuratorLens, LensWeight>;
