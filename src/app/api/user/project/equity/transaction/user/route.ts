import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { ProjectEquityRepository } from "@/repositories/project-equity.repository";
import { prisma } from "@/services/prisma";

const UserTransactionQuerySchema = z.object({
	projectId: z.string().min(1),
	userId: z.string().min(1),
});

type UserTransactionQuery = z.infer<typeof UserTransactionQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		UserTransactionQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { projectId, userId } = body as UserTransactionQuery;

		const project = await prisma.project.findUnique({
			where: { id: projectId },
		});

		if (!project) {
			return apiError.notFound("Project not found");
		}

		if (userId !== currentUser.id && project.authorId !== currentUser.id) {
			return apiError.forbidden(
				"You do not have permission to view the transaction history of this user",
			);
		}

		const transactions = await ProjectEquityRepository.getTransactionHistory({
			projectId,
			userId,
		});

		return json(transactions);
	}),
);
