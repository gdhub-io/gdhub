import {
	AI_WRITES_AT_HOUR,
	FINAL_SESSION,
	SCOPE_SESSION,
} from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { planCloses } from "@/lib/checkpoints/call";
import { MS_PER_HOUR, MS_PER_MINUTE } from "@/lib/checkpoints/days";
import { scopeWindow } from "@/lib/checkpoints/scope";
import { currentSessionOf } from "@/lib/checkpoints/sessions";
import type { CuratorReview } from "@/types/checkpoints";

/**
 * What the AI curator says right now (GDHUB-117), the same on the Workflow
 * widget and on Curator's Review: what it has done and what it waits for.
 */
export type CuratorNowState =
	/** Day 1: the first letter is being written. */
	| "reading"
	/** The first letter asks for the tasks. */
	| "tasksWanted"
	/** The tasks are checked; the plan waits for approval. */
	| "approveWanted"
	/** The plan is approved: sprint 1 is under way. */
	| "planReady"
	/** A review day, its review not written yet. */
	| "sprintReading"
	| "review"
	/** Day 15's review, with the change to the tasks still open. */
	| "scopeOpen"
	/** Day 29, the verdict not written yet. */
	| "verdictReading"
	| "verdict";

export type CuratorNow = {
	state: CuratorNowState;
	/** The session it speaks from. */
	index: number;
	at: string;
	/** The curator's own letter, when it has written one for this moment. */
	text: string | null;
	/** Until when the plan or the tasks can still change. */
	until: string | null;
	/** When this is next likely to change on its own: the page asks again then. */
	nextAt: string | null;
};

type NowInput = {
	startedAt: Date | string;
	goalAgreedAt: Date | string | null;
	planCheckedAt: Date | string | null;
	scopeConfirmedAt: Date | string | null;
	sessions: {
		index: number;
		scheduledAt: Date | string;
		endedAt: Date | string | null;
		contentStatus: string | null;
		content: unknown;
	}[];
};

// When the daily run writes reviews on the session's day, plus a margin.
const WRITTEN_AFTER_MS = AI_WRITES_AT_HOUR * MS_PER_HOUR + 15 * MS_PER_MINUTE;
// The first letter is written at payment and takes seconds.
const FIRST_LETTER_MS = MS_PER_MINUTE / 2;

const iso = (date: Date | string | null | undefined) =>
	date ? new Date(date).toISOString() : null;

export const curatorNow = (
	checkpoint: NowInput,
	now = new Date(),
): CuratorNow => {
	const sessions = [...checkpoint.sessions].sort((a, b) => a.index - b.index);
	const index = currentSessionOf(sessions, now);
	const current = sessions.find((session) => session.index === index);
	const content = (current?.content ?? null) as CuratorReview | null;
	const next = sessions.find((session) => session.index === index + 1);
	const whenWritten = (session?: { scheduledAt: Date | string }) => {
		if (!session) return null;
		const at = new Date(session.scheduledAt).getTime() + WRITTEN_AFTER_MS;
		return at > now.getTime() ? new Date(at).toISOString() : null;
	};
	const base = {
		index,
		at: iso(current?.scheduledAt ?? checkpoint.startedAt) as string,
		text: null,
		until: null,
		nextAt: whenWritten(next),
	};

	if (index === 1) {
		if (!content?.message) {
			return {
				...base,
				state: "reading",
				nextAt: new Date(now.getTime() + FIRST_LETTER_MS).toISOString(),
			};
		}
		if (!checkpoint.planCheckedAt) {
			return { ...base, state: "tasksWanted", text: content.message };
		}
		if (!checkpoint.goalAgreedAt) {
			const until = iso(
				planCloses({ ...checkpoint, curatorKind: CheckpointCuratorKind.AI }),
			);
			return {
				...base,
				state: "approveWanted",
				text: content.message,
				until,
				nextAt: until,
			};
		}
		return { ...base, state: "planReady", text: content.planLetter ?? null };
	}

	const written = current?.contentStatus === "Ready" && !!content?.message;
	if (!written) {
		return {
			...base,
			state: index === FINAL_SESSION ? "verdictReading" : "sprintReading",
			nextAt: whenWritten(current),
		};
	}
	if (index === FINAL_SESSION) {
		return { ...base, state: "verdict", text: content.message, nextAt: null };
	}
	if (index === SCOPE_SESSION && !checkpoint.scopeConfirmedAt) {
		const { closes } = scopeWindow(
			checkpoint.startedAt,
			sessions,
			CheckpointCuratorKind.AI,
		);
		if (now < closes) {
			return {
				...base,
				state: "scopeOpen",
				text: content.message,
				until: closes.toISOString(),
				nextAt: closes.toISOString(),
			};
		}
	}
	return { ...base, state: "review", text: content.message };
};
