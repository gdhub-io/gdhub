import { Prisma } from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import { after } from "next/server";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { CHECKPOINT_RUNNING_STATUSES } from "@/lib/checkpoints/status";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfDevlog } from "@/lib/space-ids";
import { type SpaceAccess, scopeOf } from "@/services/access";
import { seeDevlogMedia } from "@/services/checkpoints/flows/evidence-seen";
import { prisma } from "@/services/prisma";

const ReportQuerySchema = z.object({
	id: z.string(),
});

const CreateReportSchema = z.object({
	content: z.string(),
	contentEditor: z.any().optional(),
	video: z.string().optional(),
	publishedAt: z.string().optional(),
	projectId: z.string(),
});

const UpdateReportSchema = z.object({
	id: z.string(),
	content: z.string(),
	contentEditor: z.any().optional(),
	video: z.string().optional(),
	publishedAt: z.string().optional(),
});

type ReportQuery = z.infer<typeof ReportQuerySchema>;
type CreateReportBody = z.infer<typeof CreateReportSchema>;
type UpdateReportBody = z.infer<typeof UpdateReportSchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		ReportQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { id } = body as ReportQuery;

		const report = await prisma.projectReport.findFirst({
			where: { id },
			include: {
				project: {
					select: {
						id: true,
						name: true,
						slug: true,
						coverImage: true,
						description: true,
					},
				},
				author: {
					select: { id: true, name: true, image: true },
				},
				step: { select: { name: true } },
			},
		});

		return json(report);
	}),
);

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.devlog.create",
		idFrom: "body.projectId",
	}),
	withValidation(CreateReportSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { content, contentEditor, video, publishedAt, projectId } =
		body as CreateReportBody;

	// Bind the post to the project's current workflow step so step-scoped
	// task conditions (e.g. "post a devlog in this step") can be evaluated.
	const workflow = await prisma.projectWorkflow.findFirst({
		where: { projectId },
		select: { currentStepId: true },
	});

	// A devlog written while a checkpoint is running is that checkpoint's
	// devlog, wherever it was written from: the sprint it belongs to is read
	// off its date, and a post the checkpoint cannot see is a sprint that
	// looks silent when it was not.
	const checkpoint = await prisma.projectCheckpoint.findFirst({
		where: {
			projectId,
			status: { in: CHECKPOINT_RUNNING_STATUSES },
		},
		select: { id: true },
	});

	const post = await prisma.projectReport.createNumbered({
		data: {
			content,
			contentEditor: contentEditor || Prisma.JsonNull,
			publishedAt: publishedAt || dayjs().toISOString(),
			video,
			authorId: currentUser.id,
			projectId,
			stepId: workflow?.currentStepId ?? undefined,
			checkpointId: checkpoint?.id,
		},
	});
	after(() => seeDevlogMedia(post.id));

	return json(null);
});

/** A member edits and deletes only their own posts; the founder and admins, anyone's. */
const mayManage = async (access: SpaceAccess, userId: string, id: string) => {
	if (scopeOf(access, "project.devlog.manage") !== "own") return true;
	const report = await prisma.projectReport.findUnique({
		where: { id },
		select: { authorId: true },
	});

	return report?.authorId === userId;
};

const guardManage = withSpaceGuard({
	permission: "project.devlog.manage",
	idFrom: projectOfDevlog,
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	guardManage,
	withValidation(UpdateReportSchema),
)(async (_req, _ctx, { user, access, body }) => {
	const { id, content, contentEditor, video, publishedAt } =
		body as UpdateReportBody;
	if (!user || !access) return apiError.unauthorized();
	if (!(await mayManage(access, user.id, id))) return apiError.forbidden();

	await prisma.projectReport.update({
		where: { id },
		data: {
			content,
			contentEditor: contentEditor || Prisma.JsonNull,
			publishedAt,
			video,
		},
	});
	after(() => seeDevlogMedia(id));

	return json(null);
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	guardManage,
	withValidation(ReportQuerySchema, "query"),
)(async (_req, _ctx, { user, access, body }) => {
	const { id } = body as ReportQuery;
	if (!user || !access) return apiError.unauthorized();
	if (!(await mayManage(access, user.id, id))) return apiError.forbidden();

	await prisma.projectReport.delete({ where: { id } });

	return json(null);
});
