"use client";

import { useTranslate } from "@tolgee/react";
import { Flex } from "antd";
import dayjs from "dayjs";
import { CheckpointStatus } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointStatusSlot } from "./CheckpointStatusSlot";
import { CuratorBadge } from "./CuratorBadge";

/**
 * The checkpoint page's hero, in the shape `ProjectSpace` already renders for
 * every other page in the space — a title, a secondary line, actions on the
 * right. A page that invents its own header reads as a different product.
 *
 * The dates name a destination, not a period: a checkpoint is 28 Sep, and the
 * 28 days are the way to it. Nothing here may say a checkpoint "runs".
 */
export const useCheckpointHero = (checkpoint?: CheckpointDto | null) => {
	const { t } = useTranslate();

	if (!checkpoint) return {};

	const dates =
		checkpoint.startedAt && checkpoint.dueAt
			? `${dayjs(checkpoint.startedAt).format("D MMM")} – ${dayjs(checkpoint.dueAt).format("D MMM YYYY")}`
			: null;

	// The day count belongs here and nowhere else on the page, so the status slot
	// only appears when it has something else to say — a verdict, or the wait for
	// one — rather than repeating the number beside it.
	const day = checkpoint.day
		? t("checkpoints.status.day", "Day {day} of 28", { day: checkpoint.day })
		: null;
	const restates =
		!checkpoint.verdict && checkpoint.status === CheckpointStatus.Active;

	// A draft is not "Checkpoint 3" yet in the reader's head — it is the thing
	// being set up, and the line under it says how far that has got.
	const isDraft = checkpoint.status === CheckpointStatus.Draft;

	return {
		title: isDraft
			? t("checkpoints.draft.pageTitle", "Checkpoint draft")
			: t("checkpoints.number", "Checkpoint {number}", {
					number: checkpoint.order,
				}),
		description: isDraft
			? t("checkpoints.draft.pageSub", "Prepare · Setup incomplete")
			: [dates, checkpoint.stageName, day].filter(Boolean).join(" · "),
		actions: (
			<Flex vertical align="flex-end" gap={8}>
				{!restates && <CheckpointStatusSlot checkpoint={checkpoint} />}
				<CuratorBadge
					kind={checkpoint.curatorKind}
					curator={checkpoint.curator}
				/>
			</Flex>
		),
	};
};
