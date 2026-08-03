import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

const ProjectStatusSchema = z.object({
	projectId: z.string(),
	newStatus: z.enum(Object.values(ProjectStatus) as [string, ...string[]]),
});

type ProjectStatusBody = z.infer<typeof ProjectStatusSchema>;

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.projects.manage" }),
	withValidation(ProjectStatusSchema),
)(async (_req, _ctx, { body }) => {
	const { projectId, newStatus } = body as ProjectStatusBody;

	await prisma.project.update({
		where: { id: projectId },
		data: { status: newStatus as ProjectStatus },
	});

	return json(null);
});
