import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import { audit } from "@/repositories/checkpoints/admin";
import {
	createDraftCheckpoint,
	getCreationBlocker,
} from "@/repositories/checkpoints/checkpoint";
import {
	eligible,
	type FreeCheckpointInput,
	inputsFromProject,
	isCheckpointStage,
	stageGoal,
} from "@/repositories/checkpoints/free";
import { setCurrentStep } from "@/repositories/project/workflow";
import { assignCurator } from "@/services/checkpoints/flows/admin";
import { prisma } from "@/services/prisma";

export const startFreeCheckpoint = async (
	adminId: string,
	{ projectId, firstCall, stepId, ...assign }: FreeCheckpointInput,
) => {
	const human = assign.kind === CheckpointCuratorKind.Human;
	if (human && !firstCall) {
		return { ok: false as const, error: "firstCallMissing" as const };
	}
	const [project, blocker, curator] = await Promise.all([
		prisma.project.findFirst({
			where: { id: projectId, ...eligible },
			select: {
				workflow: {
					select: {
						id: true,
						currentStep: { select: { id: true, name: true } },
						steps: { select: { id: true, name: true } },
					},
				},
			},
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

	const workflow = project.workflow;
	const from = workflow?.currentStep;
	const to =
		stepId && stepId !== from?.id
			? workflow?.steps.find((step) => step.id === stepId)
			: null;
	if (stepId && to !== null && (!to || !isCheckpointStage(to))) {
		return { ok: false as const, error: "stageInvalid" as const };
	}
	// The admin corrects the stage first, so the draft opens on it as an author's would.
	if (workflow && to) {
		await prisma.$transaction((tx) => setCurrentStep(tx, workflow.id, to.id));
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
		if (to) {
			await prisma.auditLog.create({
				data: audit(adminId, draft.id, {
					stageMovedFrom: from?.name ?? null,
					stageMovedTo: to.name,
					reason: assign.reason,
				}),
			});
		}
	} catch (error) {
		await discard();
		throw error;
	}
	return { ok: true as const, checkpointId: draft.id };
};
