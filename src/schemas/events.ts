import { EventStatus, EventType, Language } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";

export enum EventTimeStatus {
	Upcoming = "upcoming",
	Ongoing = "ongoing",
	Past = "past",
}

// Search params arrive as strings; normalize single → array for *each* enum field.
const enumArray = <T extends [string, ...string[]]>(values: T) =>
	z.preprocess(
		(v) => (v == null ? undefined : Array.isArray(v) ? v : [v]),
		z.array(z.enum(values)).optional(),
	);

const booleanish = z.preprocess((v) => {
	if (typeof v === "boolean") return v;
	if (typeof v === "string") return v === "true";
	return undefined;
}, z.boolean().optional());

export const EventsCountQuerySchema = z.object({
	type: enumArray(Object.values(EventType) as [string, ...string[]]),
	status: enumArray(Object.values(EventStatus) as [string, ...string[]]),
	timeStatus: enumArray(
		Object.values(EventTimeStatus) as [string, ...string[]],
	),
	withDates: booleanish,
	lang: z.enum(Object.values(Language) as [string, ...string[]]).optional(),
});

export type EventsCountQuery = z.infer<typeof EventsCountQuerySchema>;
