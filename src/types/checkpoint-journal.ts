import type { CheckpointVerdict, EvidenceMatch } from "@/config/prisma-enums";

export type JournalSide = "curator" | "platform" | "team";
export type JournalMessageKind =
	/** A letter of the AI curator; `variant` says which. */
	| "letter"
	/** The AI's read of a sprint for a human curator, before a call. */
	| "brief"
	/** An artifact, a sprint artifact or a devlog's media looked at. */
	| "looked"
	| "verdict"
	/** A letter or reminder the platform sent. */
	| "sent"
	/** A pulse the platform counted from a devlog, an artifact or activity. */
	| "pulseCounted"
	| "artifact"
	| "devlog"
	| "pulse"
	/** The tasks sent for the AI's check. */
	| "tasksSent"
	| "planApproved"
	/** The tasks confirmed for the second half, day 15. */
	| "tasksConfirmed";
export type JournalMessageDto = {
	id: string;
	at: string;
	/** Null before sprint 1 starts or after the 28 days. */
	sprint: number | null;
	side: JournalSide;
	kind: JournalMessageKind;
	/** first · tasksCheck · advice · plan · review · final · report (letters); evidence · artifact · media (looks). */
	variant: string | null;
	/** The person who acted, or the one a letter went to. */
	who: string | null;
	/** The thing the line is about: a letter's subject, an artifact, a devlog. */
	title: string | null;
	/** The letter itself, or what the AI found. */
	text: string | null;
	match: EvidenceMatch | null;
	/** Why a look could not read its link. */
	unread: string | null;
	verdict: {
		proposed: CheckpointVerdict | null;
		settled: CheckpointVerdict | null;
		by: "ai" | "curator";
	} | null;
	/** Labelled facts under "Details". */
	details: { label: string; value: string }[];
	/** What it was made from, raw, under "Source". */
	source: unknown;
};
export type JournalTaskDto = {
	id: string;
	text: string;
	firstWording: string | null;
	cut: boolean;
	addedAt: string | null;
	evidence: JournalEvidenceDto[];
	/** The sprint its first artifact was added in. */
	doneIn: number | null;
};
export type JournalEvidenceDto = {
	name: string | null;
	type: string;
	link: string;
	match: EvidenceMatch | null;
	note: string | null;
};
export type JournalArtifactDto = {
	id: string;
	name: string | null;
	type: string;
	link: string;
	addedAt: string;
	addedBy: string | null;
	sprint: number | null;
	/** The tasks it proves; empty when it sits beside the tasks. */
	tasks: string[];
	read: {
		match: EvidenceMatch | null;
		text: string | null;
		source: unknown;
	} | null;
};
export type JournalDevlogDto = {
	id: string;
	number: number | null;
	publishedAt: string;
	author: string | null;
	sprint: number | null;
	text: string;
	media: {
		link: string | null;
		text: string | null;
		unread: string | null;
		source: unknown;
	}[];
};
export type CuratorJournalViewDto = {
	curator: { name: string; avatar: string | null; ai: boolean };
	startedAt: string | null;
	/** The links the AI looked at, how many it could not read, the video it watched. */
	looked: { links: number; unread: number; videoSeconds: number };
	sprints: { number: number; from: string; to: string }[];
	/** When the verdict was settled: the conversation's last divider. */
	finishedAt: string | null;
	/** The settled verdict and why, shown under the goal. */
	verdict: { verdict: CheckpointVerdict; note: string | null } | null;
	messages: JournalMessageDto[];
	plan: {
		goal: string;
		sentAt: string | null;
		approvedAt: string | null;
		approvedBy: string | null;
		confirmedAt: string | null;
		tasks: JournalTaskDto[];
	};
	/** What the team came with: the inputs it named, and what the project had made before. */
	inputs: {
		items: {
			id: string;
			text: string;
			evidence: JournalEvidenceDto[];
		}[];
		before: {
			id: string;
			name: string | null;
			type: string;
			link: string;
			addedAt: string;
		}[];
	};
	artifacts: JournalArtifactDto[];
	devlogs: JournalDevlogDto[];
};
