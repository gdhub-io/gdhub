import { createHash } from "node:crypto";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointJournalKind,
	type CheckpointVerdict,
} from "@gdhub-io/gdhub-prisma";
import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import { devlogWords } from "@/lib/checkpoints/curator-text";
import { type VerdictItem, weighOutcomes } from "@/lib/checkpoints/verdict";
import { journal } from "@/repositories/checkpoints/journal";
import { prisma } from "@/services/prisma";
import type {
	CuratorGoalCard,
	CuratorLine,
	GoalCheckInput,
} from "@/types/checkpoint-curator";
import type { VerdictContextDto } from "@/types/checkpoints";
/**
 * The AI curator's four moments, each gathering its own facts and writing back
 * what came of it — and the suggestion the author asks for, which writes nothing.
 *
 * Every write here is idempotent: the cron may fire twice on a day, a retry may land
 * after a timeout, and none of it may produce two notes or two verdicts. What
 * has already been written is the guard, not a lock.
 *
 * They do not know which day it is — GDHUB-35's cron decides that. They only
 * refuse work that is already done.
 */
export const curatorItemSelect = {
	id: true,
	kind: true,
	text: true,
	originalText: true,
	cut: true,
	addedAt: true,
	acceptedNote: true,
	evidence: {
		orderBy: { createdAt: "asc" },
		select: {
			match: true,
			matchNote: true,
			artifact: {
				select: {
					type: true,
					name: true,
					description: true,
					link: true,
					checkStatus: true,
					checkNote: true,
				},
			},
		},
	},
} as const;

/** Only what the goal card needs; the artifact fields are read off the row. */
type CardItem = {
	id: string;
	kind: CheckpointItemKind;
	text: string;
	originalText: string | null;
	cut: boolean;
	addedAt: Date | null;
};

const toLine = (item: CardItem): CuratorLine => ({
	id: item.id,
	text: item.text,
	originalText: item.originalText,
	cut: item.cut,
	addedAt: item.addedAt?.toISOString() ?? null,
});

export const toCard = (goal: string, items: CardItem[]): CuratorGoalCard => ({
	goal,
	inputs: items
		.filter((item) => item.kind === CheckpointItemKind.Input)
		.map(toLine),
	outcomes: items
		.filter((item) => item.kind === CheckpointItemKind.Outcome)
		.map(toLine),
});

export const toDevlog = (post: {
	publishedAt: Date;
	content: string;
	contentEditor: unknown;
}) => ({
	publishedAt: post.publishedAt.toISOString().slice(0, 10),
	content: devlogWords(post),
});

type ReportEvidence = VerdictItem["evidence"][number] & {
	artifact: VerdictItem["evidence"][number]["artifact"] & {
		type: string;
		name: string | null;
		description: string | null;
		link: string;
	};
};

type ReportItem = CardItem &
	Omit<VerdictItem, "evidence"> & { evidence: ReportEvidence[] };

/**
 * The card and what its evidence came to, as the report reads them. Pure, so
 * the AI curator lab builds the same input from a prepared situation.
 */
export const reportEvidence = (goal: string, items: ReportItem[]) => ({
	card: toCard(goal, items),
	artifacts: items.flatMap((item) =>
		item.evidence.map(({ artifact, match, matchNote }) => ({
			itemId: item.id,
			type: artifact.type,
			name: artifact.name,
			description: artifact.description,
			link: artifact.link,
			readable: artifact.checkStatus === "Readable",
			seen: match ? { match, note: matchNote ?? null } : null,
		})),
	),
	...weighOutcomes(items),
});

/**
 * What a stored read answers: everything the model is given and nothing else.
 * A card edited back to what it was hashes the same and costs no second call.
 */
export const goalCheckHash = ({ picture: _, ...input }: GoalCheckInput) =>
	// The picture carries today's date and the latest activity: it informs the
	// read but does not make the same card worth paying for twice.
	createHash("sha256")
		.update(JSON.stringify(input))
		.digest("hex");

export type VerdictRead = NonNullable<VerdictContextDto["aiRead"]>;

/** The AI's read of a human checkpoint's verdict — its first Verdict line. Curator and admins only. */
export const getVerdictRead = async (
	checkpointId: string,
): Promise<VerdictRead | null> => {
	const entry = await prisma.checkpointJournalEntry.findFirst({
		where: {
			checkpointId,
			kind: CheckpointJournalKind.Verdict,
			checkpoint: { curatorKind: CheckpointCuratorKind.Human },
		},
		orderBy: { createdAt: "asc" },
		select: { output: true, createdAt: true },
	});
	if (!entry) return null;
	return {
		...(entry.output as Omit<VerdictRead, "writtenAt">),
		writtenAt: entry.createdAt.toISOString(),
	};
};

/** The curator's sent verdict beside what the AI proposed, so admins see where they part. */
export const journalCuratorVerdict = async (
	checkpointId: string,
	verdict: CheckpointVerdict,
	note: string,
) => {
	const read = await prisma.checkpointJournalEntry.findFirst({
		where: { checkpointId, kind: CheckpointJournalKind.Verdict },
		orderBy: { createdAt: "asc" },
		select: { output: true },
	});
	await journal({
		checkpointId,
		kind: CheckpointJournalKind.Verdict,
		sprint: SPRINTS_PER_CHECKPOINT,
		output: {
			proposed:
				(read?.output as { proposed?: CheckpointVerdict } | undefined)
					?.proposed ?? null,
			by: "curator",
			settled: verdict,
			note,
		},
	});
};
