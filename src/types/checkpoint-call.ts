import type {
	CheckpointSessionContentStatus,
	EvidenceMatch,
} from "@/config/prisma-enums";
import type { CallState, PlanEdit } from "@/lib/checkpoints/call";
import type {
	CallNotes,
	CheckpointArtifactRef,
	GoalAdvice,
	PlanAdvice,
	PreviousVerdict,
} from "@/types/checkpoints";

export type CallRole = "curator" | "team";
export type CheckpointCallDto = {
	/** The last checkpoint's verdict, through this one's first sprint. */
	previous: PreviousVerdict | null;
	checkpointId: string;
	index: number;
	number: number;
	stageName: string;
	project: { id: string; name: string; slug: string };
	curator: { id: string; name: string; image: string | null };
	scheduledAt: string;
	state: CallState;
	/** Its window passed and the curator never came in. */
	missed: boolean;
	curatorJoinedAt: string | null;
	/** Whether the viewer — its curator or the author — may ask to move it now. */
	canMove: boolean;
	/** An open request to move it, while the room has not opened. */
	move: { to: string; mine: boolean; askerName: string } | null;
	role: CallRole;
	/** The session under way, whichever this call is. */
	current: number;
	/** The curator's only: the AI's read of the sprint behind each call (GDHUB-114). */
	briefs: CallBrief[];
	plan: {
		goal: string;
		goalAgreedAt: string | null;
		/** The AI's advice on the author's draft, before call 1. */
		advice: PlanAdvice | null;
		/** What the caller may change now; null for those who only read. */
		edit: PlanEdit;
		tasks: {
			id: string;
			text: string;
			cut: boolean;
			addedAt: string | null;
			artifacts: CheckpointArtifactRef[];
		}[];
	};
	/** The five calls for the notes switcher; `held` once a call is over. */
	sessions: {
		index: number;
		scheduledAt: string;
		held: boolean;
		missed: boolean;
		contentStatus: CheckpointSessionContentStatus | null;
	}[];
};
export type CallPresenceDto = {
	people: {
		id: string;
		name: string;
		image: string | null;
		/** "curator" and "author" are named by the page; anyone else by their role on the team. */
		role: string | null;
		inCall: boolean;
	}[];
};
export type CallNotesDto = {
	contentStatus: CheckpointSessionContentStatus | null;
	content: CallNotes | null;
	/** The transcript's parts joined in order; null until one is saved. */
	transcript: string | null;
};

export type CallMoveOptionsDto = {
	scheduledAt: string;
	/** The sprint's first days, its own dates (UTC), each with the free hours on it. */
	days: { date: string; sprintDay: number; slots: string[] }[];
};

export type CallBrief = {
	/** The call it is for. */
	index: number;
	notes: CallNotes;
	/** What each task's evidence was seen to show when the brief was written. */
	seen: { itemId: string; match: EvidenceMatch; note: string | null }[];
	/** Call 2: the goal against its stage (GDHUB-125); null on other calls and older briefs. */
	goal?: GoalAdvice | null;
	/** Calls 2 and 4: each open task against the goal, as the author with the AI curator would read it. */
	advice?: PlanAdvice | null;
	writtenAt: string;
};
