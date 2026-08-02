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
import { projectOfTeam } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";

const TeamIdQuerySchema = z.object({
	teamId: z.string(),
});

const CreateTeamDocumentSchema = z.object({
	teamId: z.string(),
	type: z.enum(Object.values(TeamDocumentType) as [string, ...string[]]),
	name: z.string(),
	description: z.string().optional(),
	link: z.string(),
});

type TeamIdQuery = z.infer<typeof TeamIdQuerySchema>;
type CreateTeamDocumentBody = z.infer<typeof CreateTeamDocumentSchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	// Replaces withTeamGuard: reading documents stays open to the whole team.
	withSpaceGuard({
		permission: "project.documents.view",
		idFrom: projectOfTeam,
	}),
	withValidation(TeamIdQuerySchema, "query"),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { teamId } = body as TeamIdQuery;

	const documents = await prisma.teamDocument.findMany({
		where: { teamId },
		orderBy: { updatedAt: "desc" },
		include: {
			createdByUser: {
				select: {
					name: true,
					image: true,
				},
			},
		},
	});

	return json(documents);
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	// Narrower than withTeamGuard on purpose: uploading is a management action,
	// so it belongs to the owner and admins, not to every team member.
	withSpaceGuard({
		permission: "project.documents.manage",
		idFrom: projectOfTeam,
	}),
	withValidation(CreateTeamDocumentSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { teamId, type, name, description, link } =
		body as CreateTeamDocumentBody;

	const document = await prisma.teamDocument.create({
		data: {
			type: type as TeamDocumentType,
			name,
			description,
			link,
			team: { connect: { id: teamId } },
			createdByUser: { connect: { id: currentUser.id } },
		},
	});

	return json(document);
});
