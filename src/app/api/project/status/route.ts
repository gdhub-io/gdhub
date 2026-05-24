import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const ProjectStatusSchema = z.object({
	projectId: z.string(),
	newStatus: z.enum(
		Object.values(prismaClient.ProjectStatus) as [string, ...string[]],
	),
});

type ProjectStatusBody = z.infer<typeof ProjectStatusSchema>;

export const PUT = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(
	withValidation(ProjectStatusSchema)(async (_req, _ctx, { body }) => {
		const { projectId, newStatus } = body as ProjectStatusBody;

		await prisma.project.update({
			where: { id: projectId },
			data: { status: newStatus as prismaClient.ProjectStatus },
		});

		return json(null);
	}),
);
