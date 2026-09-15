import { z } from "zod";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";

/**
 * The goal card is written across four steps and saved on every one of them, so
 * everything here is optional: a `Draft` holds whatever has been answered so far
 * and the server never demands the rest until the checkpoint is paid for.
 */

/** How long a checkpoint's days run. Not configurable — it is the product. */
export const CHECKPOINT_DAYS = 28;

export const CHECKPOINT_ITEM_TEXT_MAX = 200;
export const CHECKPOINT_GOAL_MAX = 300;
export const CHECKPOINT_MAX_ITEMS_PER_KIND = 12;

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
		/** Ticking the box on step 4; untick before paying and it is withdrawn. */
		acceptedTerms: z.boolean(),
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

/** The one line saying why the scope changed, kept on the checkpoint. */
export const CHECKPOINT_REVISION_NOTE_MAX = 500;

/** The day the curator's note asks the author to settle the outcome list. */
export const CHECKPOINT_SCOPE_DAY = 14;

/**
 * One line of the day-14 change: cut it, reword it, or both. Nothing here
 * deletes a line — a dropped outcome stays on the card, struck through.
 */
export const CheckpointScopeChangeSchema = z
	.object({
		itemId: z.string().min(1),
		cut: z.boolean().optional(),
		text: itemText.optional(),
	})
	.refine((change) => change.cut !== undefined || change.text !== undefined, {
		message: "A change must cut the line or reword it",
	});

export const CheckpointScopeSchema = z.object({
	note: z.string().trim().min(1).max(CHECKPOINT_REVISION_NOTE_MAX),
	/** Empty when the author keeps the list and only states the decision. */
	changes: z
		.array(CheckpointScopeChangeSchema)
		.max(CHECKPOINT_MAX_ITEMS_PER_KIND)
		.default([]),
	added: z
		.array(z.object({ text: itemText }))
		.max(CHECKPOINT_MAX_ITEMS_PER_KIND)
		.default([]),
});

/**
 * Binding an artifact to the outcomes it proves, or letting one go.
 *
 * A list rather than a field: one artifact commonly proves more than one line,
 * and the link lives on the line. Sent on its own rather than as part of the
 * goal card, because replacing the card would take the day-14 record with it.
 */
export const CheckpointEvidenceSchema = z.object({
	artifactId: z.string().min(1).nullable(),
	itemIds: z.array(z.string().min(1)).min(1).max(CHECKPOINT_MAX_ITEMS_PER_KIND),
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
export type CheckpointScopeChange = z.infer<typeof CheckpointScopeChangeSchema>;
export type CheckpointScopeBody = z.infer<typeof CheckpointScopeSchema>;
export type CheckpointEvidenceBody = z.infer<typeof CheckpointEvidenceSchema>;
