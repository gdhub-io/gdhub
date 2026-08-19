import dayjs from "dayjs";

/** A full date, or the dash that means the platform does not know. */
export const date = (value: string | null) =>
	value ? dayjs(value).format("MMM D, YYYY") : "—";

/** Day and month, for rows where the year is the reader's own context. */
export const shortDate = (value: string) => dayjs(value).format("MMM D");

export const specialityLine = (
	speciality: { name: string; level: string } | null,
) => (speciality ? `${speciality.name} · ${speciality.level}` : null);

export const share = (value: number | null) =>
	value === null ? "—" : `${Math.round(value * 10) / 10}%`;

/**
 * Past this many characters a game detail cannot share a line with its label
 * and still read as a value — it becomes a sentence, and a sentence set in the
 * right-hand third is a column of three words. Those drop under the label and
 * take the width instead. CSS cannot ask "does this fit on one line", so the
 * question is answered here.
 */
export const LONG_DETAIL = 28;
