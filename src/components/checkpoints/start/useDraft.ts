"use client";

import { createContext, useContext } from "react";
import { CHECKPOINT_AI_PRICE } from "@/config/checkpoint";
import { curatorPrice } from "@/config/checkpoint-pricing";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import { useCheckpointCurators, useCheckpoints } from "@/hooks/checkpoints";
import { useCurrentProject } from "@/hooks/project";
import type { CheckpointDto } from "@/types/checkpoints";

/** What the purchase needs of its project. */
export type PurchaseProject = {
	id: string;
	slug: string;
	name: string;
	team: { id: string } | null;
};

const PurchaseProjectContext = createContext<PurchaseProject | null>(null);

/**
 * The wizard lives outside the project space, so it hands the project down;
 * inside the space (the checkpoint page) the route's slug still resolves it.
 */
export const PurchaseProjectProvider = PurchaseProjectContext.Provider;

/**
 * The draft the purchase is editing, resolved from the project's one
 * unfinished checkpoint.
 *
 * Every step needs the same three things and the same loading rule: a disabled
 * TanStack query reports `isPending`, not `isLoading`, so gating on the wrong
 * one flashes the empty state before the project id has even arrived.
 */
export const useCheckpointDraft = () => {
	const given = useContext(PurchaseProjectContext);
	const space = useCurrentProject();
	const project: PurchaseProject | undefined = given ?? space.project;
	const { data, isPending } = useCheckpoints(project?.id);

	return {
		project,
		loading: (!given && space.isLoading) || isPending,
		draft:
			data?.current?.status === CheckpointStatus.Draft ? data.current : null,
	};
};

/**
 * What the checkpoint costs with the curator it carries. The level that sets a
 * person's price lives on the curator list, not the checkpoint, so until that
 * list arrives a human checkpoint reads at the AI price, the minimum.
 */
export const useCheckpointPrice = (checkpoint?: CheckpointDto | null) => {
	const curators = useCheckpointCurators(checkpoint?.stageName);

	if (checkpoint?.curatorKind !== CheckpointCuratorKind.Human)
		return { price: CHECKPOINT_AI_PRICE, curator: undefined };

	const curator = curators.data?.find(
		(row) => row.userId === checkpoint.curator?.id,
	);

	return {
		price: curator ? curatorPrice(curator.level) : CHECKPOINT_AI_PRICE,
		curator,
	};
};
