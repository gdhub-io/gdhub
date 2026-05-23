import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const IdQuerySchema = z.object({
	id: z.string(),
});

const LectureBodySchema = z.record(z.unknown());

type IdQuery = z.infer<typeof IdQuerySchema>;
type LectureBody = z.infer<typeof LectureBodySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		IdQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { id } = body as IdQuery;

		const lecture = await prisma.lecture.findFirst({
			where: { id },
			include: {
				listeners: { select: { id: true } },
				lecturerRequests: {
					include: { user: { select: { id: true, name: true, image: true } } },
				},
			},
		});

		return json(lecture);
	}),
);

export const POST = withAuth({ mode: "user" })(
	withValidation(LectureBodySchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const data = body as LectureBody & {
			directionId: string;
			lecturerId?: string;
			stage?: string;
			wishes?: unknown;
		};
		const { directionId, lecturerId, ...other } = data;

		const lecture = await prisma.lecture.create({
			data: {
				...(other as any),
				requestedBy:
					other.stage === prismaClient.LectureStage.Requested
						? { connect: { id: currentUser.id as string } }
						: undefined,
				lecturer:
					other.stage === prismaClient.LectureStage.Proposed
						? { connect: { id: lecturerId } }
						: undefined,
				direction: { connect: { id: directionId } },
				isArchived: false,
				wishes: other.wishes || undefined,
			},
		});

		return json(lecture);
	}),
);

export const PUT = withAuth({ mode: "user" })(
	withValidation(LectureBodySchema)(async (req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		if (!id) return apiError.badRequest("id is required");
		const data = body as LectureBody;

		await prisma.lecture.update({
			where: { id },
			data,
		});

		return json({ success: true });
	}),
);

export const DELETE = withAuth({ mode: "user" })(
	async (req, _ctx, { user }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		if (!id) return apiError.badRequest("id is required");

		await prisma.lecture.delete({
			where: { id },
		});

		return json({ success: true });
	},
);
