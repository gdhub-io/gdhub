import { TeamDocumentType } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withTeamGuard,
	withValidation,
} from "@/lib/api-handlers";
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

export const GET = withAuth({ mode: "user" })(
	withTeamGuard()(
		withValidation(
			TeamIdQuerySchema,
			"query",
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
		}),
	),
);

export const POST = withAuth({ mode: "user" })(
	withTeamGuard()(
		withValidation(CreateTeamDocumentSchema)(
			async (_req, _ctx, { user, body }) => {
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
			},
		),
	),
);
