"use client";

import {
	IconArrowDown,
	IconArrowRight,
	IconCalendarPlus,
	IconShare3,
} from "@tabler/icons-react";
import type { QueryKey } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { entryHubHref } from "@/components/checkpoints/entry/hrefs";
import { ShareResultModal } from "@/components/checkpoints/ShareResultModal";
import { formatShort } from "@/components/WorkflowPath/dates";
import { FINAL_SESSION } from "@/config/checkpoint";
import { CheckpointVerdict } from "@/config/prisma-enums";
import type { CheckpointReviewDto } from "@/types/checkpoints";
import { type CuratorAction, CuratorMessage } from "./CuratorMessage";
import { useCuratorNow } from "./useCuratorNow";

/** What the curator says now, and the buttons for what it asks (GDHUB-117). */
export function Message({
	checkpointId,
	review,
	refreshKey,
	onShowPlan,
	onShowReview,
}: {
	/** The page's own checkpoint; without one (the lab, the stories) there is nothing to share. */
	checkpointId?: string;
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
	const [sharing, setSharing] = useState(false);

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
		// Frame 12.10.4: the verdict, as a card for the team's own post (GDHUB-144).
		if (checkpointId)
			actions.push({
				key: "share",
				label: t("checkpoints.review.action.share", "Share the result"),
				icon: <IconShare3 size={16} />,
				onClick: () => setSharing(true),
			});
	}

	return (
		<>
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
			{checkpointId && (
				<ShareResultModal
					checkpointId={checkpointId}
					open={sharing}
					onClose={() => setSharing(false)}
				/>
			)}
		</>
	);
}
