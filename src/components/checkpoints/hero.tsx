"use client";

import { useTranslate } from "@tolgee/react";
import { Flex } from "antd";
import dayjs from "dayjs";
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

	return {
		title: t("checkpoints.number", "Checkpoint {number}", {
			number: checkpoint.order,
		}),
		description: [checkpoint.stageName, dates].filter(Boolean).join(" · "),
		actions: (
			<Flex vertical align="flex-end" gap={8}>
				<CheckpointStatusSlot checkpoint={checkpoint} />
				<CuratorBadge
					kind={checkpoint.curatorKind}
					curator={checkpoint.curator}
				/>
			</Flex>
		),
	};
};
