"use client";

import { useTranslate } from "@tolgee/react";
import { Tag } from "antd";
import { useParams } from "next/navigation";
import { CheckpointStatus } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointCurator } from "./CheckpointCard/Curator";
import { dayRange } from "./CheckpointCard/SprintTrack";
import { CheckpointStatusSlot } from "./CheckpointStatusSlot";

/**
 * The checkpoint page's hero, in the shape `ProjectSpace` already renders for
 * every other page in the space, carrying what `CheckpointCard` carries in the
 * same places: number and stage, dates and day, the curator on the right.
 *
 * The dates name a destination, not a period: a checkpoint is 28 Sep, and the
 * 28 days are the way to it. Nothing here may say a checkpoint "runs".
 */
export const useCheckpointHero = (checkpoint?: CheckpointDto | null) => {
	const { t } = useTranslate();
	const params = useParams<{ slug?: string }>();

	if (!checkpoint) return {};

	const dates =
		checkpoint.startedAt && checkpoint.dueAt
			? dayRange(checkpoint.startedAt, checkpoint.dueAt, "D MMM YYYY")
			: null;

	// While the 28 days run the day belongs to the dates; after that the slot
	// beside the title says what is being waited for.
	const running = checkpoint.status === CheckpointStatus.Active;
	const day =
		running && checkpoint.day
			? t("checkpoints.status.day", "Day {day} of 28", { day: checkpoint.day })
			: null;

	// A draft is not "Checkpoint 3" yet in the reader's head — it is the thing
	// being set up, and the line under it says how far that has got. Once it has
	// been bought it is that checkpoint for good, even if a curator handed it
	// back and the status is a draft again.
	const isDraft =
		checkpoint.status === CheckpointStatus.Draft &&
		!checkpoint.paymentId &&
		!checkpoint.curatorDeclinedAt;

	if (isDraft) {
		return {
			title: t("checkpoints.draft.pageTitle", "Checkpoint draft"),
			description: t("checkpoints.draft.pageSub", "Prepare · Setup incomplete"),
		};
	}

	return {
		title: t("checkpoints.number", "Checkpoint {number}", {
			number: checkpoint.order,
		}),
		titleExtra: (
			<>
				<Tag className="gd-tag-on-page">{checkpoint.stageName}</Tag>
				{!running && <CheckpointStatusSlot checkpoint={checkpoint} />}
			</>
		),
		description: [dates, day].filter(Boolean).join(" · "),
		// Paid for and waiting: until the 28 days run, the curator is a choice
		// rather than a fact.
		actions: checkpoint.status !== CheckpointStatus.AwaitingCurator && (
			<CheckpointCurator checkpoint={checkpoint} projectSlug={params?.slug} />
		),
	};
};
