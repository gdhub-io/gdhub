import { z } from "zod";
import { apiError, json, withAuth, withValidation } from "@/lib/api-handlers";
import {
	filterParticipantRooms,
	participationSelect,
} from "@/services/chat/participation";
import { loadRoomLabels } from "@/services/chat/room-labels";
import { prisma } from "@/services/prisma";
import type { ChatRoomMeta } from "@/types/chat";

const MetaQuerySchema = z.object({
	// Comma-separated Matrix room ids from the client's own sync.
	matrixRoomIds: z.string().min(1),
});

type MetaQuery = z.infer<typeof MetaQuerySchema>;

// Batch matrixRoomId -> registry facts for the chat list. Rooms unknown to the
// registry are absent from the response; the client treats them as direct.
export const GET = withAuth({ mode: "user" })(
	withValidation(
		MetaQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		if (!user) return apiError.unauthorized();
		const { matrixRoomIds } = body as MetaQuery;

		const ids = matrixRoomIds
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean)
			.slice(0, 500);
		if (ids.length === 0) return json({});

		const rooms = await prisma.chatRoom.findMany({
			where: { matrixRoomId: { in: ids } },
			select: {
				matrixRoomId: true,
				status: true,
				finishedAt: true,
				...participationSelect,
			},
		});

		// The client sends room ids from its own sync, but nothing stops it from
		// sending someone else's — the mapping would then confirm which rooms
		// exist and what they are about.
		const own = (await filterParticipantRooms(rooms, user.id)).filter(
			(room): room is typeof room & { matrixRoomId: string } =>
				!!room.matrixRoomId,
		);
		const labels = await loadRoomLabels(own);

		return json(
			Object.fromEntries(
				own.map((room): [string, ChatRoomMeta] => [
					room.matrixRoomId,
					{
						kind: room.kind,
						status: room.status,
						label: labels.get(room.matrixRoomId) ?? null,
						closedAt: room.finishedAt?.toISOString() ?? null,
					},
				]),
			),
		);
	}),
);
