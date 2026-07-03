import { z } from "zod";
import { apiError, json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const KindsQuerySchema = z.object({
	// Comma-separated Matrix room ids from the client's own sync.
	matrixRoomIds: z.string().min(1),
});

type KindsQuery = z.infer<typeof KindsQuerySchema>;

// Batch matrixRoomId -> ChatRoomKind mapping for the drawer's grouped chat
// list. Rooms unknown to the registry are simply absent from the response —
// the client buckets them into the Direct group.
export const GET = withAuth({ mode: "user" })(
	withValidation(
		KindsQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		if (!user) return apiError.unauthorized();
		const { matrixRoomIds } = body as KindsQuery;

		const ids = matrixRoomIds
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean)
			.slice(0, 500);
		if (ids.length === 0) return json({});

		const rooms = await prisma.chatRoom.findMany({
			where: { matrixRoomId: { in: ids } },
			select: { matrixRoomId: true, kind: true },
		});

		return json(
			Object.fromEntries(
				rooms
					.filter((room) => room.matrixRoomId)
					.map((room) => [room.matrixRoomId as string, room.kind]),
			),
		);
	}),
);
