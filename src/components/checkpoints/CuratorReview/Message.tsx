"use client";

import {
	IconArrowDown,
	IconArrowRight,
	IconCalendarPlus,
} from "@tabler/icons-react";
import type { QueryKey } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import { useRouter } from "next/navigation";
import { entryHubHref } from "@/components/checkpoints/entry/hrefs";
import { formatShort } from "@/components/WorkflowPath/dates";
import { FINAL_SESSION } from "@/config/checkpoint";
import { CheckpointVerdict } from "@/config/prisma-enums";
import type { CheckpointReviewDto } from "@/types/checkpoints";
import { type CuratorAction, CuratorMessage } from "./CuratorMessage";
import { useCuratorNow } from "./useCuratorNow";

/** What the curator says now, and the buttons for what it asks (GDHUB-117). */
export function Message({
	review,
	refreshKey,
	onShowPlan,
	onShowReview,
}: {
	review: CheckpointReviewDto;
	refreshKey: QueryKey | null;
	onShowPlan: () => void;
	onShowReview: (index: number) => void;
}) {
	const { t } = useTranslate();
	const router = useRouter();
	const workflow = `/user/project/${review.project.slug}/workflow`;
	const now = review.curatorNow;
	const said = useCuratorNow(now, refreshKey);
	const final = review.current === FINAL_SESSION;

	const actions: CuratorAction[] = [];
	if (said?.action && now) {
		const asks = said.action === "tasks";
		actions.push({
			key: said.action,
			label: said.label ?? "",
			icon: <IconArrowDown size={16} />,
			primary: asks,
			onClick:
				said.action === "review" || said.action === "verdict"
					? () => onShowReview(now.index)
					: onShowPlan,
		});
	}
	if (final && review.verdict) {
		const { nextStage } = review;
		if (review.verdict.verdict === CheckpointVerdict.StageClosed && nextStage) {
			actions.push({
				key: "move",
				label: t("checkpoints.review.action.move", "Move to {stage}", {
					stage: t(nextStage.key, nextStage.name),
				}),
				icon: <IconArrowRight size={16} />,
				primary: true,
				// The path moves it, with its equity and required-task checks.
				onClick: () => router.push(workflow),
			});
		}
		actions.push({
			key: "next",
			label: t("checkpoints.review.action.plan", "Plan Checkpoint {n}", {
				n: review.number + 1,
			}),
			icon: <IconCalendarPlus size={16} />,
			onClick: () => router.push(entryHubHref(review.project.slug)),
		});
	}

	return (
		<CuratorMessage
			character={review.character}
			date={formatShort(now?.at ?? review.startedAt)}
			message={said?.message ?? ""}
			extra={
				said?.deadline && (
					<Typography.Text type="secondary">{said.deadline}</Typography.Text>
				)
			}
			verdict={final ? review.verdict?.verdict : null}
			actions={actions}
		/>
	);
}
