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

const CreateWorkflowSchema = z.object({
	name: z.string().min(1),
	title: z.string().min(1),
	description: z.string().optional(),
	steps: WorkflowStepsTemplateSchema.optional(),
	/** Start from a copy of this template instead of an empty one. */
	copyFromId: z.string().optional(),
});

type CreateWorkflowBody = z.infer<typeof CreateWorkflowSchema>;

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.workflow.manage" }),
	withValidation(CreateWorkflowSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { name, title, description, steps, copyFromId } =
		body as CreateWorkflowBody;

	// Copying happens here rather than in the browser: the source is the stored
	// template, not whatever a client claims it contains.
	let initialSteps = steps ?? [];
	if (copyFromId) {
		const source = await prisma.workflowSchema.findUnique({
			where: { id: copyFromId },
			select: { steps: true },
		});
		if (!source) return apiError.notFound("Template to copy was not found");
		initialSteps = source.steps as typeof initialSteps;
	}

	// `name` is the identifier other systems address the template by, so a
	// collision is a naming problem the admin can fix, not a server error.
	const taken = await prisma.workflowSchema.findUnique({
		where: { name },
		select: { id: true },
	});
	if (taken) {
		return apiError.badRequest(`The identifier “${name}” is already in use`);
	}

	const workflow = await prisma.workflowSchema.create({
		data: {
			name,
			title,
			description: description || undefined,
			steps: initialSteps,
		},
	});

	return json({ id: workflow.id });
});
