import { FINAL_SESSION } from "@/config/checkpoint";

/** The `?sprint=` value a session opens on: its sprint, the last one the verdict. */
export const sprintParam = (index: number) =>
	index >= FINAL_SESSION ? "verdict" : String(index);

/** The session a `?sprint=` value names; undefined for none or a wrong one. */
export const sessionOfSprintParam = (value: string | undefined) => {
	if (value === "verdict") return FINAL_SESSION;
	const index = Number(value);
	return Number.isInteger(index) && index >= 1 && index < FINAL_SESSION
		? index
		: undefined;
};

/**
 * Path to Checkpoint N (GDHUB-117): everything of one checkpoint's work on one
 * page, opened on a sprint — or, without one, on the sprint under way.
 */
export const checkpointPathHref = (
	slug: string,
	number: number,
	index?: number,
) =>
	`/user/project/${slug}/workflow/cp${number}${index ? `?sprint=${sprintParam(index)}` : ""}`;
