import type { ChatRoomKind } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";

type LabelRoom = { matrixRoomId: string; kind: ChatRoomKind; context: unknown };

type RoomContext = { adviceRequestId?: string; vacancyId?: string };

/**
 * Project name per Matrix room id for the chat list — two batched queries for
 * the whole list instead of one provider load per room.
 */
export async function loadRoomLabels(
	rooms: LabelRoom[],
): Promise<Map<string, string>> {
	const contextOf = (room: LabelRoom) => (room.context ?? {}) as RoomContext;
	const adviceIds = rooms
		.filter((room) => room.kind === "AdviceRequest")
		.map((room) => contextOf(room).adviceRequestId)
		.filter((id): id is string => !!id);
	const vacancyIds = rooms
		.filter((room) => room.kind === "VacancyOffer")
		.map((room) => contextOf(room).vacancyId)
		.filter((id): id is string => !!id);

	const [advice, vacancies] = await Promise.all([
		adviceIds.length
			? prisma.adviceRequest.findMany({
					where: { id: { in: adviceIds } },
					select: { id: true, project: { select: { name: true } } },
				})
			: [],
		vacancyIds.length
			? prisma.teamVacancy.findMany({
					where: { id: { in: vacancyIds } },
					select: {
						id: true,
						team: { select: { project: { select: { name: true } } } },
					},
				})
			: [],
	]);

	const adviceNames = new Map(advice.map((a) => [a.id, a.project?.name]));
	const vacancyNames = new Map(
		vacancies.map((v) => [v.id, v.team?.project?.name]),
	);

	const labels = new Map<string, string>();
	for (const room of rooms) {
		const ctx = contextOf(room);
		const name =
			room.kind === "AdviceRequest" && ctx.adviceRequestId
				? adviceNames.get(ctx.adviceRequestId)
				: room.kind === "VacancyOffer" && ctx.vacancyId
					? vacancyNames.get(ctx.vacancyId)
					: undefined;
		if (name) labels.set(room.matrixRoomId, name);
	}
	return labels;
}
