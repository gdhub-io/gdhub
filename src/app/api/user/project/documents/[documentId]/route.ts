import { TeamDocumentType } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfTeamDocument } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";

const TeamIdQuerySchema = z.object({
	teamId: z.string(),
});

const UpdateTeamDocumentSchema = z.object({
	type: z
		.enum(Object.values(TeamDocumentType) as [string, ...string[]])
		.optional(),
	name: z.string().optional(),
	description: z.string().optional(),
	link: z.string().optional(),
});

type TeamIdQuery = z.infer<typeof TeamIdQuerySchema>;
type UpdateTeamDocumentBody = z.infer<typeof UpdateTeamDocumentSchema>;

/**
 * The space is resolved from the document itself, not from the `teamId` the
 * caller sends: otherwise a document id from one project could be paired with a
 * team id from another.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.documents.view",
		idFrom: projectOfTeamDocument,
	}),
	withValidation(TeamIdQuerySchema, "query"),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { teamId } = body as TeamIdQuery;
	const { documentId } = (await ctx.params) as { documentId: string };

	const document = await prisma.teamDocument.findUnique({
		where: { teamId, id: documentId },
	});

	return json(document);
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.documents.manage",
		idFrom: projectOfTeamDocument,
	}),
	withValidation(UpdateTeamDocumentSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { type, name, description, link } = body as UpdateTeamDocumentBody;
	const { documentId } = (await ctx.params) as { documentId: string };

	const updatedDocument = await prisma.teamDocument.update({
		where: { id: documentId },
		data: {
			type: type as TeamDocumentType | undefined,
			name,
			description,
			link,
		},
	});

	return json(updatedDocument);
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.documents.manage",
		idFrom: projectOfTeamDocument,
	}),
	withValidation(TeamIdQuerySchema, "query"),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { teamId } = body as TeamIdQuery;
	const { documentId } = (await ctx.params) as { documentId: string };

	await prisma.teamDocument.delete({
		where: { id: documentId, teamId },
	});

	return json({ success: true });
});
