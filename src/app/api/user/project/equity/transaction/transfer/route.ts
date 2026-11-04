import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { ProjectEquityRepository } from "@/repositories/project/equity";
import { prisma } from "@/services/prisma";

const EquityTransferSchema = z.object({
	projectId: z.string().min(1),
	toUserId: z.string().min(1),
	percentage: z.number().min(0.01),
	reason: z.string().optional(),
});

type EquityTransferBody = z.infer<typeof EquityTransferSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(EquityTransferSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { projectId, toUserId, percentage, reason } =
			body as EquityTransferBody;

		const project = await prisma.project.findUnique({
			where: { id: projectId },
		});

		if (!project) {
			return apiError.notFound("Project not found");
		}

		const fromUserId = currentUser.id;

		const result = await ProjectEquityRepository.transferShare({
			fromUserId,
			toUserId,
			projectId,
			percentage,
			reason,
		});

		return json(result);
	}),
);
