import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { statusChangeData } from "@/lib/project-status";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

const ProjectStatusSchema = z.object({
	projectId: z.string(),
	newStatus: z.nativeEnum(ProjectStatus),
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.projects.manage" }),
	withValidation(ProjectStatusSchema),
)(async (_req, _ctx, { body }) => {
	const { projectId, newStatus } = body as z.infer<typeof ProjectStatusSchema>;

	const project = await prisma.project.findUnique({
		where: { id: projectId },
		select: { status: true },
	});
	if (!project) return apiError.notFound("Project not found");
	if (project.status === newStatus) return json(null);

	await prisma.project.update({
		where: { id: projectId },
		data: statusChangeData(newStatus, new Date()),
	});

	return json(null);
});
