import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { auth } from "@/auth";
import { apiError, json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

type Params = Promise<{ projectReportId: string }>;

const getApplauseState = async (projectReportId: string, userId?: string) => {
	const [activity, count] = await Promise.all([
		prisma.applauseActivity.findUnique({
			where: {
				type_subjectId: {
					type: prismaClient.ApplauseActivityType.ProjectReport,
					subjectId: projectReportId,
				},
			},
			select: {
				id: true,
			},
		}),
		prisma.projectReport.getApplauseCount({
			projectReportId,
		}),
	]);

	// Guard on activity?.id: with no activity row yet, activityId would be
	// undefined and Prisma would drop the filter, matching the user's applause
	// on ANY activity → falsely reporting hasApplauded for this subject.
	const userApplause =
		userId && activity?.id
			? await prisma.applause.findFirst({
					where: {
						userId,
						activityId: activity.id,
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
	const { projectReportId } = await params;

	if (!projectReportId) {
		return apiError.badRequest("Project report ID is required");
	}

	const session = await auth();
	const userId = session?.user?.id;

	const state = await getApplauseState(projectReportId, userId);
	return json(state);
}

async function mutateApplause(
	method: "POST" | "DELETE",
	projectReportId: string,
) {
	if (!projectReportId) {
		return apiError.badRequest("Project report ID is required");
	}

	const session = await auth();
	const userId = session?.user?.id;

	if (!userId) {
		return apiError.unauthorized();
	}

	try {
		const report = await prisma.projectReport.findUnique({
			where: { id: projectReportId },
			select: { id: true, projectId: true },
		});

		if (!report) {
			return apiError.notFound("Project report not found");
		}

		const activity = await prisma.applauseActivity.upsert({
			where: {
				type_subjectId: {
					type: prismaClient.ApplauseActivityType.ProjectReport,
					subjectId: projectReportId,
				},
			},
			update: {},
			create: {
				type: prismaClient.ApplauseActivityType.ProjectReport,
				subjectId: projectReportId,
				projectId: report.projectId,
				projectReportId: report.id,
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

		const state = await getApplauseState(projectReportId, userId);
		return json(state);
	} catch (error) {
		console.error("Error handling applause:", error);
		return apiError.internal();
	}
}

export async function POST(_req: Request, { params }: { params: Params }) {
	const { projectReportId } = await params;
	return mutateApplause("POST", projectReportId);
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
	const { projectReportId } = await params;
	return mutateApplause("DELETE", projectReportId);
}
