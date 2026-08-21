/**
 * "The platform has no value" — never "it counted none". A zero is a measured
 * fact and prints as `0`; this is what prints when there is nothing to print.
 */
export const DASH = "—";

/**
 * Movement against the previous window of equal length.
 *
 * `null` — print a dash — in two cases, and they are different sentences told
 * with the same mark: the previous window is outside retention so it is
 * unknown, or it measured zero, against which "+∞%" is not a percentage.
 */
export const deltaPercent = (
	total: number,
	previousTotal: number | null,
): number | null => {
	if (previousTotal === null || previousTotal === 0) return null;
	return ((total - previousTotal) / previousTotal) * 100;
};

export const formatDelta = (delta: number) => {
	const rounded = Math.round(delta);
	return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${Math.abs(rounded)}%`;
};
