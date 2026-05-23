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

const TransactionQuerySchema = z.object({
	projectId: z.string().min(1),
});

type TransactionQuery = z.infer<typeof TransactionQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		TransactionQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { projectId } = body as TransactionQuery;

		const project = await prisma.project.findUnique({
			where: { id: projectId },
		});

		if (!project) {
			return apiError.notFound("Project not found");
		}

		const teamMember = await prisma.teamMember.findFirst({
			where: {
				userId: currentUser.id,
				team: { project: { id: projectId } },
			},
		});

		if (project.authorId !== currentUser.id && !teamMember) {
			return apiError.forbidden(
				"You do not have permission to view the transaction history",
			);
		}

		const transactions = await ProjectEquityRepository.getTransactionHistory({
			projectId,
		});

		return json(transactions);
	}),
);
