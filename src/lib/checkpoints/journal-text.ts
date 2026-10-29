import type { CallNotes, PlanAdvice } from "@/types/checkpoints";

/**
 * A review's notes and halfway advice as labelled lines: how the sprint stands,
 * each task, the focus set for the next sprint, the advice under the tasks.
 */
export const reviewDetails = (
	notes: CallNotes | null | undefined,
	advice: Pick<PlanAdvice, "tasks" | "add"> | null | undefined,
	taskName: (id: string | null) => string | null,
) => [
	...(notes?.inShort ? [{ label: "inShort", value: notes.inShort }] : []),
	...(notes?.discussed ?? []).map((row) => ({
		label: taskName(row.itemId) ?? row.itemId,
		value: row.text,
	})),
	...(notes?.agreed.length
		? [
				{
					label: "focus",
					value: notes.agreed.map((row) => row.text).join("\n"),
				},
			]
		: []),
	...(advice?.tasks.length || advice?.add.length
		? [
				{
					label: "advice",
					value: [
						...advice.tasks.map(
							(row) => `${taskName(row.itemId) ?? row.itemId}: ${row.note}`,
						),
						...advice.add.map((line) => `+ ${line}`),
					].join("\n"),
				},
			]
		: []),
];

/** The first line of a devlog, short enough to stand as its title. */
export const firstLine = (content: string) =>
	content
		.split("\n")
		.find((line) => line.trim())
		?.trim()
		.slice(0, 120) ?? "";
