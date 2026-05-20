import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { auth } from "@/auth";
import { apiError, json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

type Params = Promise<{ projectId: string }>;

const getApplauseState = async (projectId: string, userId?: string) => {
	const [activity, count] = await Promise.all([
		prisma.applauseActivity.findUnique({
			where: {
				type_subjectId: {
					type: prismaClient.ApplauseActivityType.Project,
					subjectId: projectId,
				},
			},
			select: {
				id: true,
			},
		}),
		prisma.project.getApplauseCount({
			projectId,
		}),
	]);

	const userApplause = userId
		? await prisma.applause.findFirst({
				where: {
					userId,
					activityId: activity?.id,
				},
				select: { id: true },
			})
		: null;

	return {
		count,
		hasApplauded: !!userApplause,
	};
};

export async function GET(_req: Request, { params }: { params: Params }) {
	const { projectId } = await params;

	if (!projectId) {
		return apiError.badRequest("Project ID is required");
	}

	const session = await auth();
	const userId = session?.user?.id;

	const state = await getApplauseState(projectId, userId);
	return json(state);
}

async function mutateApplause(method: "POST" | "DELETE", projectId: string) {
	if (!projectId) {
		return apiError.badRequest("Project ID is required");
	}

	const session = await auth();
	const userId = session?.user?.id;

	if (!userId) {
		return apiError.unauthorized();
	}

	try {
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			select: { id: true },
		});

		if (!project) {
			return apiError.notFound("Project not found");
		}

		const activity = await prisma.applauseActivity.upsert({
			where: {
				type_subjectId: {
					type: prismaClient.ApplauseActivityType.Project,
					subjectId: projectId,
				},
			},
			update: {},
			create: {
				type: prismaClient.ApplauseActivityType.Project,
				subjectId: projectId,
				projectId: project.id,
			},
			select: { id: true },
		});

		if (method === "POST") {
			await prisma.applause.upsert({
				where: {
					userId_activityId: {
						userId,
						activityId: activity.id,
					},
				},
				update: {},
				create: {
					userId,
					activityId: activity.id,
				},
			});
		} else {
			await prisma.applause.deleteMany({
				where: {
					userId,
					activityId: activity.id,
				},
			});
		}

		const state = await getApplauseState(projectId, userId);
		return json(state);
	} catch (error) {
		console.error("Error handling project applause:", error);
		return apiError.internal();
	}
}

export async function POST(_req: Request, { params }: { params: Params }) {
	const { projectId } = await params;
	return mutateApplause("POST", projectId);
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
	const { projectId } = await params;
	return mutateApplause("DELETE", projectId);
}
