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
import { prisma } from "@/services/prisma";

const CreateWorkflowSchema = z.object({
	name: z.string().min(1),
	title: z.string().min(1),
	description: z.string().optional(),
	steps: z.array(z.any()).optional(),
});

type CreateWorkflowBody = z.infer<typeof CreateWorkflowSchema>;

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.workflow.manage" }),
	withValidation(CreateWorkflowSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { name, title, description, steps } = body as CreateWorkflowBody;

	const workflow = await prisma.workflowSchema.create({
		data: {
			name,
			title,
			description: description || undefined,
			steps: (steps ?? []) as PrismaJson.WorkflowStep[],
		},
	});

	return json({ id: workflow.id });
});
