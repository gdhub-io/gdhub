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
import { projectOfEquity } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";

const EquityQuerySchema = z.object({
	projectId: z.string().min(1),
});

const EquityUpdateSchema = z.object({
	id: z.string().min(1),
	mentorFundShare: z.number().min(2),
	investmentReserve: z.number().min(0),
});

type EquityQuery = z.infer<typeof EquityQuerySchema>;
type EquityUpdateBody = z.infer<typeof EquityUpdateSchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		EquityQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { projectId } = body as EquityQuery;

		const projectEquity = await prisma.projectEquity.findUnique({
			where: { projectId },
			include: {
				equityAllocations: {
					include: {
						promises: {
							where: { isExecuted: false },
							take: 1,
							orderBy: { createdAt: "desc" },
						},
					},
				},
			},
		});

		if (!projectEquity) {
			return apiError.notFound("Project not found");
		}

		return json(projectEquity);
	}),
);

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.equity.manage",
		idFrom: projectOfEquity,
	}),
	withValidation(EquityUpdateSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id, mentorFundShare, investmentReserve } = body as EquityUpdateBody;

	const projectEquity = await prisma.projectEquity.findUnique({
		where: { id },
		include: { project: true },
	});

	if (!projectEquity) {
		return apiError.notFound("Project equity not found");
	}

	if (projectEquity.project.authorId !== currentUser.id) {
		return apiError.forbidden(
			"You are not authorized to modify this project equity",
		);
	}

	const totalAllocation = mentorFundShare + investmentReserve;
	if (totalAllocation > 100) {
		return apiError.badRequest("Total allocation exceeds 100%");
	}

	const updatedEquity = await prisma.projectEquity.update({
		where: { id },
		data: { mentorFundShare, investmentReserve },
	});

	return json(updatedEquity);
});
