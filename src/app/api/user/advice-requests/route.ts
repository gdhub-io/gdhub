import { AdviceRequestStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const enumArray = <T extends [string, ...string[]]>(values: T) =>
	z.preprocess(
		(v) => (v == null ? undefined : Array.isArray(v) ? v : [v]),
		z.array(z.enum(values)).optional(),
	);

const AdviceRequestsQuerySchema = z.object({
	teamId: z.string().optional(),
	projectId: z.string().optional(),
	advisorId: z.string().optional(),
	status: enumArray(
		Object.values(AdviceRequestStatus) as [string, ...string[]],
	),
});

type AdviceRequestsQuery = z.infer<typeof AdviceRequestsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		AdviceRequestsQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { teamId, projectId, advisorId, status } =
			body as AdviceRequestsQuery;

		const needUserRequests = !teamId && !projectId && !advisorId;
		const userId = needUserRequests ? currentUser.id : undefined;

		const adviceRequests = await prisma.adviceRequest.findMany({
			where: {
				project: {
					id: projectId,
					team: teamId ? { id: teamId } : undefined,
				},
				toUser: { id: advisorId },
				status: status ? { in: status as AdviceRequestStatus[] } : undefined,
				OR: userId ? [{ fromUserId: userId }, { toUserId: userId }] : undefined,
			},
			select: {
				fromUser: {
					select: {
						id: true,
						image: true,
						profile: { select: { name: true } },
					},
				},
				toUser: {
					select: {
						id: true,
						image: true,
						profile: { select: { name: true } },
					},
				},
				project: {
					select: { id: true, slug: true, name: true, coverImage: true },
				},
				fromTelegramUser: true,
				createdAt: true,
				finishedAt: true,
				status: true,
				id: true,
				comment: true,
				feedback: true,
				topic: true,
				// Needed so "Open chat" resolves the registry room by id instead of
				// the legacy `advreq-{id}` alias.
				matrixRoomId: true,
			},
			orderBy: { createdAt: "desc" },
		});

		return json(adviceRequests);
	}),
);
