import { ProjectArtifactType } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { ARTIFACT_DESCRIPTION_MAX } from "@/components/MyProjectArtifacts/artifacts";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfArtifact } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";

const UpdateArtifactSchema = z.object({
	type: z
		.enum(Object.values(ProjectArtifactType) as [string, ...string[]])
		.optional(),
	name: z.string().optional(),
	description: z.string().max(ARTIFACT_DESCRIPTION_MAX).optional(),
	link: z.string().optional(),
});

type UpdateArtifactBody = z.infer<typeof UpdateArtifactSchema>;

/**
 * The space is resolved from the artifact itself rather than from anything the
 * caller sends, so an artifact id from one project cannot be paired with a
 * project id from another.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.artifacts.view",
		idFrom: projectOfArtifact,
	}),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { artifactId } = (await ctx.params) as { artifactId: string };

	const artifact = await prisma.projectArtifact.findUnique({
		where: { id: artifactId },
	});

	return json(artifact);
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.artifacts.manage",
		idFrom: projectOfArtifact,
	}),
	withValidation(UpdateArtifactSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { type, name, description, link } = body as UpdateArtifactBody;
	const { artifactId } = (await ctx.params) as { artifactId: string };

	const updatedArtifact = await prisma.projectArtifact.update({
		where: { id: artifactId },
		data: {
			type: type as ProjectArtifactType | undefined,
			name,
			description,
			link,
		},
	});

	return json(updatedArtifact);
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.artifacts.manage",
		idFrom: projectOfArtifact,
	}),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { artifactId } = (await ctx.params) as { artifactId: string };

	await prisma.projectArtifact.delete({
		where: { id: artifactId },
	});

	return json({ success: true });
});
