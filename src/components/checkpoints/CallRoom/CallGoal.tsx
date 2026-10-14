"use client";

import { IconTarget } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Input, Typography } from "antd";
import { type ReactNode, useState } from "react";
import { IconTile } from "@/components/ui";
import { CHECKPOINT_GOAL_MAX } from "@/config/checkpoint";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import { usePlanChange } from "./CallPlan";
import styles from "./style.module.scss";

/** The checkpoint goal, agreed on call 1 and read on every call after it. */
export function CallGoal({ call }: { call: CheckpointCallDto }) {
	const onChange = usePlanChange(call.checkpointId);

	return (
		<GoalCard
			goal={call.plan.goal}
			editable={call.plan.edit === "goalAndTasks"}
			onSave={(goal) => onChange({ op: "goal", goal })}
		/>
	);
}

export type GoalCardProps = {
	goal: string;
	/** Call 1 while the plan is open: the goal is still being agreed. */
	editable: boolean;
	onSave: (goal: string) => Promise<void>;
};

/** Frames tMANJ (read-only) and I3JHtO (call 1). */
export function GoalCard({ goal, editable, onSave }: GoalCardProps) {
	const { t } = useTranslate();

	let value: ReactNode;
	if (editable) {
		value = (
			<>
				<GoalInput key={goal} goal={goal} onSave={onSave} />
				<Typography.Text className={`${styles.small} ${styles.tertiary}`}>
					{t(
						"checkpoints.call.goal.hint",
						"Agree it on this call — it locks when the call ends.",
					)}
				</Typography.Text>
			</>
		);
	} else if (goal) {
		value = (
			<Typography.Text className={styles.goalValue}>{goal}</Typography.Text>
		);
	} else {
		value = (
			<Typography.Text type="secondary">
				{t("checkpoints.call.plan.noGoal", "No goal agreed yet.")}
			</Typography.Text>
		);
	}

	return (
		<section className={styles.goal}>
			<IconTile icon={IconTarget} size="sm" />
			<div className={styles.goalText}>
				<Typography.Text type="secondary" className={styles.small}>
					{t("checkpoints.call.goal.label", "Checkpoint goal")}
				</Typography.Text>
				{value}
			</div>
		</section>
	);
}

/** Saved on blur or Enter; an emptied or refused goal goes back to what was saved. */
function GoalInput({ goal, onSave }: Pick<GoalCardProps, "goal" | "onSave">) {
	const [value, setValue] = useState(goal);

	const commit = () => {
		const next = value.trim();
		if (!next || next === goal) {
			setValue(goal);
			return;
		}
		onSave(next).catch(() => setValue(goal));
	};

	return (
		<Input.TextArea
			value={value}
			autoSize={{ minRows: 1 }}
			maxLength={CHECKPOINT_GOAL_MAX}
			onChange={(event) => setValue(event.target.value)}
			onBlur={commit}
			onPressEnter={(event) => {
				if (event.shiftKey) return;
				event.preventDefault();
				event.currentTarget.blur();
			}}
		/>
	);
}
