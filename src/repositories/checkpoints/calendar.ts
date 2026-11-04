import { FINAL_SESSION } from "@/config/checkpoint";
import { firstName } from "@/helpers/format";
import { buildIcs } from "@/lib/calendar";
import {
	type CalendarViewer,
	type CheckpointCalendarEvent,
	checkpointCalendar,
} from "@/lib/checkpoints/calendar";
import {
	calendarToken,
	calendarTokenOf,
} from "@/lib/checkpoints/calendar-token";
import { appUrl, checkpointPathHref } from "@/lib/checkpoints/hrefs";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { viewerOf, viewerSelect } from "@/repositories/checkpoints/viewer";
import { prisma } from "@/services/prisma";
import type { CheckpointCalendarDto } from "@/types/checkpoints";

/** The checkpoint as one of its people sees its dates; null for anyone else, or before it starts. */
const loadCalendar = async (checkpointId: string, userId: string) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			id: true,
			projectId: true,
			createdAt: true,
			startedAt: true,
			curatorKind: true,
			curator: { select: { name: true } },
			project: {
				select: {
					...viewerSelect(userId).project.select,
					name: true,
					slug: true,
				},
			},
			curatorId: true,
			sessions: {
				select: { index: true, scheduledAt: true, endedAt: true },
			},
		},
	});
	const viewer = checkpoint && viewerOf(checkpoint, userId);
	const startedAt = checkpoint?.startedAt;
	if (!startedAt || !viewer) return null;

	const as: CalendarViewer = viewer === "curator" ? "curator" : "team";
	return {
		checkpoint,
		startedAt,
		as,
		events: checkpointCalendar({ ...checkpoint, startedAt }, as),
	};
};

const feedUrl = (userId: string, checkpointId: string) =>
	`${appUrl()}/api/calendar/${calendarToken(userId, checkpointId)}.ics`;

/** The Calendar tab (12.08.14–15, 12.10.5). */
export const getCheckpointCalendar = async (
	checkpointId: string,
	userId: string,
): Promise<CheckpointCalendarDto | null> => {
	const calendar = await loadCalendar(checkpointId, userId);
	if (!calendar) return null;

	return {
		startedAt: calendar.startedAt.toISOString(),
		as: calendar.as,
		curatorName: firstName(calendar.checkpoint.curator?.name ?? "") || null,
		projectName: calendar.checkpoint.project.name,
		events: calendar.events.map((event) => ({
			...event,
			start: event.start.toISOString(),
		})),
		feedUrl: feedUrl(userId, checkpointId),
	};
};

/** What each date is called in the person's own calendar app. */
const titleOf = (
	event: CheckpointCalendarEvent,
	as: CalendarViewer,
	names: { curator: string; project: string },
) => {
	const team = as === "team";
	const final = event.index === FINAL_SESSION;
	switch (event.kind) {
		case "call":
			return `Call ${event.index} with ${team ? names.curator : names.project}${final ? " — the final one" : ""}`;
		case "plan":
			return "The AI curator checks your plan";
		case "review":
			return final
				? "The final review and the verdict"
				: `The AI curator's review of sprint ${(event.index ?? 1) - 1}`;
		case "brief":
			return `The AI's brief of sprint ${event.index}`;
		case "deadline":
			return team
				? `Sprint ${event.index} due: devlog, build, artifacts`
				: `${names.project}: sprint ${event.index} due`;
		case "change":
			return team
				? "The tasks can change"
				: `${names.project} may change the tasks`;
		case "evidence":
			return team
				? "Attach evidence to every task"
				: `${names.project} is reminded of missing evidence`;
		case "verdict":
			return team ? `${names.curator}'s verdict` : "Send your verdict";
	}
};

/**
 * The subscription and the download: the person's dates as iCalendar, built
 * anew on every fetch so a moved call moves in their calendar too. Dates and
 * titles only — the link opens without signing in.
 */
export const calendarFeed = async (token: string) => {
	const named = calendarTokenOf(token);
	if (!named) return null;
	const calendar = await loadCalendar(named.checkpointId, named.userId);
	if (!calendar) return null;
	const { checkpoint, as, events } = calendar;

	const number = await checkpointNumber(checkpoint);
	const names = {
		curator: firstName(checkpoint.curator?.name ?? "") || "the AI curator",
		project: checkpoint.project.name,
	};
	const url = `${appUrl()}${checkpointPathHref(checkpoint.project.slug, number)}`;

	return buildIcs(
		events.map((event) => ({
			uid: event.uid,
			title: titleOf(event, as, names),
			start: event.start,
			minutes: event.minutes,
			allDay: event.allDay,
			url,
		})),
		`${checkpoint.project.name} · Checkpoint ${number}`,
	);
};
