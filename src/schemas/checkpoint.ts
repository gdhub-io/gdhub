import { z } from "zod";
import {
	CHECKPOINT_GOAL_MAX,
	CHECKPOINT_ITEM_TEXT_MAX,
	CHECKPOINT_MAX_ITEMS_PER_KIND,
} from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";

/**
 * The goal card is written across four steps and saved on every one of them, so
 * everything here is optional: a `Draft` holds whatever has been answered so far
 * and the server never demands the rest until the checkpoint is paid for.
 */

const itemText = z.string().trim().min(1).max(CHECKPOINT_ITEM_TEXT_MAX);

export const CheckpointItemInputSchema = z.object({
	kind: z.nativeEnum(CheckpointItemKind),
	text: itemText,
	/** A `ProjectArtifact` id, or null to leave the line unproven. */
	artifactId: z.string().nullish(),
});

export const CreateCheckpointSchema = z.object({
	projectId: z.string(),
});

export const UpdateCheckpointSchema = z
	.object({
		goal: z.string().trim().max(CHECKPOINT_GOAL_MAX),
		curatorKind: z.nativeEnum(CheckpointCuratorKind),
		/**
		 * The person who will run it. Null for the AI curator, and only ever a
		 * specialist who has said they take mentees — the route checks.
		 */
		curatorId: z.string().min(1).nullable(),
		/**
		 * The whole side, replaced. A goal card is a short list edited as a list —
		 * per-line patches would need ids the step pages do not carry, and the
		 * order is part of what is being edited.
		 */
		inputs: z
			.array(CheckpointItemInputSchema)
			.max(CHECKPOINT_MAX_ITEMS_PER_KIND),
		outcomes: z
			.array(CheckpointItemInputSchema)
			.max(CHECKPOINT_MAX_ITEMS_PER_KIND),
		/**
		 * The day the 28 days are meant to start, chosen on the When question and
		 * written onto the draft. It is an intention until the checkpoint is paid
		 * for — and, with a human curator, until they confirm they can run it.
		 */
		startedAt: z.coerce.date().nullable(),
	})
	.partial();

/** One change to the plan on a call: the goal, or a task added, reworded or removed. */
export const PlanChangeSchema = z.discriminatedUnion("op", [
	z.object({
		op: z.literal("goal"),
		goal: z.string().trim().min(1).max(CHECKPOINT_GOAL_MAX),
	}),
	z.object({ op: z.literal("add"), text: itemText }),
	z.object({
		op: z.literal("edit"),
		itemId: z.string().min(1),
		text: itemText,
	}),
	z.object({ op: z.literal("remove"), itemId: z.string().min(1) }),
]);

export type PlanChange = z.infer<typeof PlanChangeSchema>;

/** An artifact added to the outcomes it proves; one artifact commonly proves more than one. */
export const CheckpointEvidenceSchema = z.object({
	artifactId: z.string().min(1),
	itemIds: z.array(z.string().min(1)).min(1).max(CHECKPOINT_MAX_ITEMS_PER_KIND),
});

/** One artifact let go from one task; the task keeps any others (GDHUB-115). */
export const DetachEvidenceSchema = z.object({
	artifactId: z.string().min(1),
	itemId: z.string().min(1),
});

export const CheckpointListQuerySchema = z.object({
	projectId: z.string(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type CheckpointItemInput = z.infer<typeof CheckpointItemInputSchema>;
export type CreateCheckpointBody = z.infer<typeof CreateCheckpointSchema>;
export type UpdateCheckpointBody = z.infer<typeof UpdateCheckpointSchema>;
export type CheckpointListQuery = z.infer<typeof CheckpointListQuerySchema>;
export type CheckpointEvidenceBody = z.infer<typeof CheckpointEvidenceSchema>;
