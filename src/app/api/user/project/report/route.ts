import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
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
			},
		});

		return json(report);
	}),
);

export const POST = withAuth({ mode: "user" })(
	withValidation(CreateReportSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { content, contentEditor, video, publishedAt, projectId } =
			body as CreateReportBody;

		await prisma.projectReport.create({
			data: {
				content,
				contentEditor: contentEditor || Prisma.JsonNull,
				publishedAt: publishedAt || dayjs().toISOString(),
				video,
				authorId: currentUser.id,
				projectId,
			},
		});

		return json(null);
	}),
);

export const PUT = withAuth({ mode: "user" })(
	withValidation(UpdateReportSchema)(async (_req, _ctx, { body }) => {
		const { id, content, contentEditor, video, publishedAt } =
			body as UpdateReportBody;

		await prisma.projectReport.update({
			where: { id },
			data: {
				content,
				contentEditor: contentEditor || Prisma.JsonNull,
				publishedAt,
				video,
			},
		});

		return json(null);
	}),
);

export const DELETE = withAuth({ mode: "user" })(
	withValidation(
		ReportQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { id } = body as ReportQuery;

		await prisma.projectReport.delete({ where: { id } });

		return json(null);
	}),
);
