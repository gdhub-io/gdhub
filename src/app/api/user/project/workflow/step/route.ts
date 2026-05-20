import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const UpdateStepSchema = z.object({
	id: z.string(),
	plannedAt: z
		.union([z.string(), z.date(), z.null()])
		.transform((v) => (v === null ? null : new Date(v as string | Date))),
});

type UpdateStepBody = z.infer<typeof UpdateStepSchema>;

export const PUT = withAuth({ mode: "user" })(
	withValidation(UpdateStepSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { id, plannedAt } = body as UpdateStepBody;

		const step = await prisma.projectWorkflowStep.findUnique({
			where: { id },
			include: {
				projectWorkflow: true,
			},
		});

		if (step?.order === 1 && plannedAt) {
			await prisma.projectWorkflow.update({
				where: { id: step.projectWorkflowId },
				data: { createdAt: plannedAt },
			});
		}

		await prisma.projectWorkflowStep.update({
			where: { id },
			data: { plannedAt: plannedAt || null },
		});

		return json({ success: true });
	}),
);
