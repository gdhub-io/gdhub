import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const CreateWorkflowSchema = z.object({
	name: z.string().min(1),
	title: z.string().min(1),
	description: z.string().optional(),
	steps: z.array(z.any()).optional(),
});

type CreateWorkflowBody = z.infer<typeof CreateWorkflowSchema>;

export const POST = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(
	withValidation(CreateWorkflowSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { name, title, description, steps } = body as CreateWorkflowBody;

		const workflow = await prisma.workflowSchema.create({
			data: {
				name,
				title,
				description: description || undefined,
				steps: (steps ?? []) as Prisma.InputJsonValue[],
			},
		});

		return json({ id: workflow.id });
	}),
);
