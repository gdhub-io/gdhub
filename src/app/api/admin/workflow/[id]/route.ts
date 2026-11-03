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
import { WorkflowStepsTemplateSchema } from "@/schemas/workflow";
import { prisma } from "@/services/prisma";

const UpdateWorkflowSchema = z.object({
	name: z.string().optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	/** For the AI curator only: where every stage leads (GDHUB-97). Empty clears it. */
	goal: z.string().trim().max(1000).optional(),
	// The template's steps are one JSON column: whatever arrives replaces the
	// lot. An empty array would blank every project created from it afterwards,
	// so the schema refuses one — a template is emptied by deleting it.
	steps: WorkflowStepsTemplateSchema.optional(),
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
	const { name, title, description, goal, steps } = body as UpdateWorkflowBody;

	const workflow = await prisma.workflowSchema.update({
		where: { id },
		data: {
			name: name || undefined,
			title: title || undefined,
			description: description || undefined,
			goal: goal === undefined ? undefined : goal || null,
			// Validated into the column's own declared shape, so no cast is needed.
			steps,
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
