import { z } from "zod";
import {
	CHECKPOINT_ENTRY_ITEMS_MAX,
	CHECKPOINT_ITEM_TEXT_MAX,
} from "@/config/checkpoint";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { getCreationBlocker } from "@/repositories/checkpoints/checkpoint";
import {
	foreignArtifactIds,
	getEntryPrefill,
	getEntryStatus,
	isProjectFounder,
	saveEntryProject,
} from "@/repositories/checkpoints/entry";
import type { EntryProjectInput } from "@/types/checkpoints";

const PrefillQuerySchema = z.object({ projectId: z.string().min(1) });

// The same text cap as the goal card: these lines become the draft's inputs,
// which the wizard saves back through its own schema.
const EntryProjectSchema = z.object({
	projectId: z.string().min(1),
	items: z
		.array(
			z.object({
				text: z.string().trim().min(1).max(CHECKPOINT_ITEM_TEXT_MAX),
				artifactId: z
					.string()
					.min(1)
					.nullish()
					.transform((id) => id ?? null),
			}),
		)
		.min(1)
		.max(CHECKPOINT_ENTRY_ITEMS_MAX),
});

export const GET = pipe(
	withAuth({ mode: "user" }),
	withValidation(PrefillQuerySchema, "query"),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { projectId } = body as z.infer<typeof PrefillQuerySchema>;

	if (!(await isProjectFounder(currentUser.id, projectId))) {
		return apiError.forbidden();
	}

	return json(await getEntryPrefill(projectId));
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withValidation(EntryProjectSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const input = body as EntryProjectInput;

	if (!(await isProjectFounder(currentUser.id, input.projectId))) {
		return apiError.forbidden();
	}

	const foreign = await foreignArtifactIds(
		input.projectId,
		input.items.flatMap((item) => (item.artifactId ? [item.artifactId] : [])),
	);
	if (foreign.length) {
		return apiError.badRequest("Artifact does not belong to the project", {
			artifactIds: foreign,
		});
	}

	// A running checkpoint already measures from its own day 1; a second draft
	// beside it would be a second purchase.
	const blocker = await getCreationBlocker(input.projectId);
	if (blocker) {
		return json(
			{ error: blocker.reason, statusCode: 409, blocker },
			{ status: 409 },
		);
	}

	await saveEntryProject(input);

	return json(await getEntryStatus(currentUser.id));
});
