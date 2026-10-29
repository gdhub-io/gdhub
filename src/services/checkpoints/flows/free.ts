import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import {
	createDraftCheckpoint,
	getCreationBlocker,
} from "@/repositories/checkpoints/checkpoint";
import {
	eligible,
	type FreeCheckpointInput,
	inputsFromProject,
	stageGoal,
} from "@/repositories/checkpoints/free";
import { assignCurator } from "@/services/checkpoints/flows/admin";
import { prisma } from "@/services/prisma";

export const startFreeCheckpoint = async (
	adminId: string,
	{ projectId, firstCall, ...assign }: FreeCheckpointInput,
) => {
	const human = assign.kind === CheckpointCuratorKind.Human;
	if (human && !firstCall) {
		return { ok: false as const, error: "firstCallMissing" as const };
	}
	const [project, blocker, curator] = await Promise.all([
		prisma.project.findFirst({
			where: { id: projectId, ...eligible },
			select: { id: true },
		}),
		getCreationBlocker(projectId),
		human && assign.userId
			? prisma.user.findUnique({
					where: { id: assign.userId },
					select: { id: true },
				})
			: null,
	]);
	// The same rule a purchase meets; a free one is given even while sales are closed.
	if (!project || (blocker && blocker.reason !== "purchaseClosed")) {
		return { ok: false as const, error: "notEligible" as const };
	}
	if (human && !curator) {
		return { ok: false as const, error: "curatorMissing" as const };
	}

	const draft = await createDraftCheckpoint(projectId);
	// A draft no curator could take is not left behind as the author's own.
	const discard = () =>
		prisma.projectCheckpoint.delete({ where: { id: draft.id } });
	try {
		await prisma.projectCheckpoint.update({
			where: { id: draft.id },
			data: {
				goal: stageGoal(draft.stageName),
				...(human && { startedAt: firstCall }),
				...(!draft.items.some(
					(item) => item.kind === CheckpointItemKind.Input,
				) && {
					items: { create: await inputsFromProject(projectId) },
				}),
			},
		});
		const assigned = await assignCurator(draft.id, adminId, assign);
		if (!assigned.ok) {
			await discard();
			return assigned;
		}
	} catch (error) {
		await discard();
		throw error;
	}
	return { ok: true as const, checkpointId: draft.id };
};
