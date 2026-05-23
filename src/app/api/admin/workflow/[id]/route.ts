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

const UpdateWorkflowSchema = z.object({
	name: z.string().optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	steps: z.array(z.any()).optional(),
});

type UpdateWorkflowBody = z.infer<typeof UpdateWorkflowSchema>;

export const GET = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const workflow = await prisma.workflowSchema.findUnique({
		where: { id },
	});

	return json(workflow);
});

export const PUT = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(
	withValidation(UpdateWorkflowSchema)(async (_req, ctx, { user, body }) => {
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
				steps: steps as Prisma.InputJsonValue[] | undefined,
			},
		});

		return json(workflow);
	}),
);

export const DELETE = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	await prisma.workflowSchema.delete({ where: { id } });

	return json({ success: true });
});
