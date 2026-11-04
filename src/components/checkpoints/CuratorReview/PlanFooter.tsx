"use client";

import { useTranslate } from "@tolgee/react";
import { App, Button, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import callStyles from "@/components/checkpoints/CallRoom/style.module.scss";
import { AI_APPROVE_HOURS, SCOPE_SESSION } from "@/config/checkpoint";
import { trackCheckpoint } from "@/helpers/gtm";
import type { CheckpointReviewDto } from "@/types/checkpoints";

/**
 * Under the open plan, the same two steps on day 1 and day 15: "Save and send
 * to the curator" (frames 12.10.1 and 12.10.5, the confirm 12.10.1c) and, once
 * checked, "Approve the plan" (12.10.1b) or "Confirm the tasks" (12.10.5a).
 */
export function PlanFooter({
	plan,
	checked,
	advising,
	onSend,
	approving,
	onApprove,
}: {
	plan: CheckpointReviewDto["plan"];
	checked: boolean;
	advising: boolean;
	onSend: () => void;
	approving: boolean;
	onApprove: () => void;
}) {
	const { t } = useTranslate();
	const { modal } = App.useApp();
	const until = plan.editUntil && dayjs(plan.editUntil).format("D MMM, HH:mm");
	const empty = !plan.tasks.some((task) => !task.cut);
	const dayOne = plan.edit === "goalAndTasks";

	let note: string;
	let button: ReactNode;
	if (!checked) {
		note = dayOne
			? t(
					"checkpoints.review.plan.openUntilSent",
					"Open until you send the tasks",
				)
			: t(
					"checkpoints.review.plan.sendChanges",
					"Open until {date} · send your changes for a check before confirming",
					{ date: until },
				);
		const send = (
			<Button
				type="primary"
				loading={advising}
				disabled={empty}
				onClick={() =>
					modal.confirm({
						title: t(
							"checkpoints.review.plan.sendTitle",
							"Send the tasks to the curator?",
						),
						content: dayOne
							? t(
									"checkpoints.review.plan.sendBody",
									"The curator reads the goal and the tasks and writes what to keep, shorten or reword. You then have {hours} more hours to adjust them.",
									{ hours: AI_APPROVE_HOURS },
								)
							: t(
									"checkpoints.review.plan.sendChangesBody",
									"The curator reads your changed tasks against the goal once and writes what to keep or change. You then confirm them.",
								),
						okText: t("checkpoints.review.plan.sendOk", "Save and send"),
						cancelText: t(
							"checkpoints.review.plan.keepEditing",
							"Keep editing",
						),
						onOk: () => {
							trackCheckpoint("checkpoint_plan_saved", {
								session_index: dayOne ? 1 : SCOPE_SESSION,
							});
							onSend();
						},
					})
				}
			>
				{t("checkpoints.review.plan.send", "Save and send to the curator")}
			</Button>
		);
		button = empty ? (
			<Tooltip
				title={t("checkpoints.review.plan.addOne", "Add at least one task")}
			>
				{send}
			</Tooltip>
		) : (
			send
		);
	} else {
		note = dayOne
			? t(
					"checkpoints.review.plan.checkedNote",
					"The curator checked your plan · adjust it if needed and approve · approves itself on {date}",
					{ date: until },
				)
			: t(
					"checkpoints.review.plan.checkedChangesNote",
					"The curator checked your changes · adjust them if needed and confirm · confirms itself on {date}",
					{ date: until },
				);
		button = (
			<Button
				type="primary"
				loading={approving}
				disabled={dayOne && empty}
				onClick={onApprove}
			>
				{dayOne
					? t("checkpoints.review.plan.approve", "Approve the plan")
					: t("checkpoints.review.plan.confirm", "Confirm the tasks")}
			</Button>
		);
	}

	return (
		<div className={callStyles.planFooter}>
			<Typography.Text type="secondary" className={callStyles.grow}>
				{note}
			</Typography.Text>
			{button}
		</div>
	);
}
