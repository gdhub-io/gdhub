import { ProjectArtifactType } from "@gdhub-io/gdhub-prisma";
import { after } from "next/server";
import { z } from "zod";
import { ARTIFACT_DESCRIPTION_MAX } from "@/components/MyProjectArtifacts/artifacts";
import { ArtifactCheckStatus } from "@/config/prisma-enums";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { checkAndLook } from "@/repositories/evidence-seen";
import { prisma } from "@/services/prisma";

const ProjectIdQuerySchema = z.object({
	projectId: z.string(),
});

const CreateArtifactSchema = z.object({
	projectId: z.string(),
	type: z.enum(Object.values(ProjectArtifactType) as [string, ...string[]]),
	name: z.string(),
	description: z.string().max(ARTIFACT_DESCRIPTION_MAX).optional(),
	link: z.string(),
});

type ProjectIdQuery = z.infer<typeof ProjectIdQuerySchema>;
type CreateArtifactBody = z.infer<typeof CreateArtifactSchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	// Replaces withTeamGuard: reading artifacts stays open to the whole team.
	withSpaceGuard({
		permission: "project.artifacts.view",
		idFrom: "query.projectId",
	}),
	withValidation(ProjectIdQuerySchema, "query"),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { projectId } = body as ProjectIdQuery;

	const artifacts = await prisma.projectArtifact.findMany({
		where: { projectId },
		orderBy: { createdAt: "asc" },
		include: {
			createdByUser: {
				select: {
					name: true,
					image: true,
				},
			},
			step: { select: { id: true, name: true, order: true } },
		},
	});

	return json(artifacts);
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	// Narrower than withTeamGuard on purpose: uploading is a management action,
	// so it belongs to the owner and admins, not to every team member.
	withSpaceGuard({
		permission: "project.artifacts.manage",
		idFrom: "body.projectId",
	}),
	withValidation(CreateArtifactSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { projectId, type, name, description, link } =
		body as CreateArtifactBody;

	// Filed under the stage the project is on when the artifact arrives.
	const workflow = await prisma.projectWorkflow.findUnique({
		where: { projectId },
		select: { currentStepId: true },
	});

	const artifact = await prisma.projectArtifact.create({
		data: {
			type: type as ProjectArtifactType,
			name,
			description,
			link,
			checkStatus: ArtifactCheckStatus.Pending,
			step: workflow?.currentStepId
				? { connect: { id: workflow.currentStepId } }
				: undefined,
			project: { connect: { id: projectId } },
			createdByUser: { connect: { id: currentUser.id } },
		},
	});
	after(() => checkAndLook(artifact.id));

	return json(artifact);
});
