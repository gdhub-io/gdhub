import { z } from "zod";
import {
	ArtifactCheckStatus,
	CheckpointItemKind,
	CheckpointVerdict,
	EvidenceMatch,
} from "@/config/prisma-enums";
import type { GoalCheckInput } from "@/services/checkpoint-curator";
import type {
	PlanAdviceInput,
	SprintReviewInput,
} from "@/services/curator-review";

/**
 * What each call of the lab accepts. The curator's own input types are the
 * contract: `satisfies` breaks the build when one of them changes and this
 * does not. The evidence, review and report inputs are the situation before
 * the platform's own work on it — reading links, describing media, weighing
 * the evidence — which the lab then does the way production does.
 */

/** The character the AI curator plays, kept on the checkpoint; the lab sets it from its profile picker. */
const character = z.string().nullish();

const line = z.object({
	id: z.string(),
	text: z.string(),
	originalText: z.string().nullish(),
	cut: z.boolean().optional(),
	addedAt: z.string().nullish(),
});

const card = z.object({
	goal: z.string(),
	inputs: z.array(line),
	outcomes: z.array(line),
});

const workflow = z.object({
	currentStage: z.string(),
	nextStage: z.string().nullable(),
	description: z.string().nullable(),
	requiredTasks: z.array(z.object({ name: z.string(), done: z.boolean() })),
});

const hours = z.object({ from: z.number(), to: z.number() }).nullable();

const team = z.object({
	members: z.number().int(),
	stated: z.number().int(),
	hoursPerWeek: hours,
	hoursPerRun: hours,
	people: z.array(
		z.object({
			name: z.string(),
			role: z.string(),
			level: z.string().nullable(),
			hoursPerWeek: hours,
			weeks: z.array(z.boolean()),
		}),
	),
});

const seen = z
	.object({ match: z.nativeEnum(EvidenceMatch), note: z.string().nullable() })
	.nullable();

const task = z.object({
	id: z.string(),
	text: z.string(),
	done: z.object({ type: z.string(), name: z.string().nullable() }).nullable(),
	cut: z.boolean(),
	firstWording: z.string().nullable(),
	seen,
});

export const goalCheckInput = z.object({
	character,
	card,
	workflow,
	project: z.object({
		name: z.string(),
		pitch: z.string().nullable(),
		genre: z.string().nullable(),
	}),
	author: z
		.object({
			speciality: z.string(),
			level: z.string(),
			experience: z.string().nullable(),
		})
		.nullable(),
	team,
	previous: z
		.object({
			verdict: z.nativeEnum(CheckpointVerdict),
			note: z.string().nullable(),
		})
		.nullable(),
	picture: z.string(),
}) satisfies z.ZodType<GoalCheckInput>;

export const planAdviceInput = z.object({
	character,
	goal: z.string(),
	workflow,
	team,
	tasks: z.array(task),
	moment: z.enum(["start", "midway"]),
	review: z.string().nullable(),
	picture: z.string(),
}) satisfies z.ZodType<PlanAdviceInput>;

/** A sprint review before its media is looked at: the links, not what they show. */
export const sprintReviewInput = z.object({
	character,
	goal: z.string(),
	workflow,
	sprint: z.number().int().min(1).max(4),
	tasks: z.array(task),
	devlogs: z.array(z.string()),
	/** The images and videos in those devlogs, read and described on Run. */
	media: z.array(z.string().url()),
	artifacts: z.array(
		z.object({ type: z.string(), name: z.string().nullable() }),
	),
	team,
	focusLastReview: z.array(z.string()),
	verdict: z
		.object({ verdict: z.nativeEnum(CheckpointVerdict), note: z.string() })
		.nullable(),
	picture: z.string(),
}) satisfies z.ZodType<Omit<SprintReviewInput, "devlogMedia">>;

/** One task's evidence: a link read live, or what a read would have returned. */
export const evidenceInput = z.object({
	task: z.string(),
	artifactType: z.string(),
	artifactName: z.string().nullable(),
	description: z.string().nullable(),
	devlogs: z.array(z.string()),
	evidence: z.union([
		z.object({ link: z.string().url() }),
		z.object({ text: z.string().nullable(), unread: z.string().nullable() }),
	]),
});

const item = z.object({
	id: z.string(),
	kind: z.nativeEnum(CheckpointItemKind),
	text: z.string(),
	originalText: z.string().nullable().default(null),
	cut: z.boolean().default(false),
	addedAt: z.string().nullable().default(null),
	acceptedNote: z.string().nullish(),
	evidenceMatch: z.nativeEnum(EvidenceMatch).nullish(),
	evidenceMatchNote: z.string().nullish(),
	artifact: z
		.object({
			type: z.string(),
			name: z.string().nullable(),
			description: z.string().nullable(),
			link: z.string(),
			checkStatus: z.nativeEnum(ArtifactCheckStatus).nullable(),
			checkNote: z.string().nullish(),
		})
		.nullable(),
});

/** Day 29 as the checkpoint's rows hold it, before the evidence is weighed. */
export const reportInput = z.object({
	character,
	goal: z.string(),
	workflow,
	revision: z
		.object({ revisedAt: z.string(), note: z.string().nullable() })
		.nullable(),
	items: z.array(item),
	devlogs: z.array(z.object({ publishedAt: z.string(), content: z.string() })),
	team,
	picture: z.string(),
});

/** A prepared input for one call, named for what it tries. */
export type Situation<S extends z.ZodType> = {
	id: string;
	label: string;
	input: z.input<S>;
};

/** The language of a situation's data and of the answers asked for. */
export type LabLanguage = "en" | "ru";

/** A lab label in the chosen language. */
export const say = (language: LabLanguage, en: string, ru: string) =>
	language === "ru" ? ru : en;
