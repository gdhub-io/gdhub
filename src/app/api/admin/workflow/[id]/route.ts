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

const UpdateWorkflowSchema = z.object({
	name: z.string().optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	steps: z.array(z.any()).optional(),
});

type UpdateWorkflowBody = z.infer<typeof UpdateWorkflowSchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.workflow.view" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const workflow = await prisma.workflowSchema.findUnique({
		where: { id },
	});

	return json(workflow);
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.workflow.manage" }),
	withValidation(UpdateWorkflowSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };
	const { name, title, description, steps } = body as UpdateWorkflowBody;

	const workflow = await prisma.workflowSchema.update({
		where: { id },
		data: {
			name: name || undefined,
			title: title || undefined,
			description: description || undefined,
			steps: steps as PrismaJson.WorkflowStep[] | undefined,
		},
	});

	return json(workflow);
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.workflow.manage" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	await prisma.workflowSchema.delete({ where: { id } });

	return json({ success: true });
});
