"use client";

import { useTranslate } from "@tolgee/react";
import { App, Button, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import callStyles from "@/components/checkpoints/CallRoom/style.module.scss";
import { AI_APPROVE_HOURS } from "@/config/checkpoint";
import { trackCheckpoint } from "@/helpers/gtm";
import type { CheckpointReviewDto } from "@/types/checkpoints";

/**
 * Under the open plan: on day 1, "Save and send to the curator" (frame
 * 12.10.1, its confirm 12.10.1c) and, once checked, "Approve the plan"
 * (12.10.1b); on day 15, confirming the tasks.
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

	let note: string;
	let button: ReactNode;
	if (plan.edit === "goalAndTasks" && !checked) {
		note = t(
			"checkpoints.review.plan.openUntilSent",
			"Open until you send the tasks",
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
						content: t(
							"checkpoints.review.plan.sendBody",
							"The curator reads the goal and the tasks and writes what to keep, shorten or reword. You then have {hours} more hours to adjust them.",
							{ hours: AI_APPROVE_HOURS },
						),
						okText: t("checkpoints.review.plan.sendOk", "Save and send"),
						cancelText: t(
							"checkpoints.review.plan.keepEditing",
							"Keep editing",
						),
						onOk: () => {
							trackCheckpoint("checkpoint_plan_saved", { session_index: 1 });
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
		const dayOne = plan.edit === "goalAndTasks";
		note = dayOne
			? t(
					"checkpoints.review.plan.checkedNote",
					"The curator checked your plan · adjust it if needed and approve · approves itself on {date}",
					{ date: until },
				)
			: t(
					"checkpoints.review.plan.confirmNote",
					"Open until {date} · then the tasks stay as they are",
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
