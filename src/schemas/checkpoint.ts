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
	})
	.partial();

export const CheckpointListQuerySchema = z.object({
	projectId: z.string(),
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type CheckpointItemInput = z.infer<typeof CheckpointItemInputSchema>;
export type CreateCheckpointBody = z.infer<typeof CreateCheckpointSchema>;
export type UpdateCheckpointBody = z.infer<typeof UpdateCheckpointSchema>;
export type CheckpointListQuery = z.infer<typeof CheckpointListQuerySchema>;
