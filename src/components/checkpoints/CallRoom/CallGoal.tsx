"use client";

import { IconSparkles, IconTarget } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Alert, Input, Typography } from "antd";
import { type ReactNode, useState } from "react";
import { IconTile } from "@/components/ui";
import { CHECKPOINT_GOAL_MAX } from "@/config/checkpoint";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import type { GoalAdvice } from "@/types/checkpoints";
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
	/** Needed only while `editable`. */
	onSave?: (goal: string) => Promise<void>;
	/** The AI curator's word on the goal, on day 1 (frame SWg9T). */
	advice?: GoalAdvice | null;
};

/** Frame CUPxr: read the same on every call and every AI review; on call 1 the text itself is editable. */
export function GoalCard({ goal, editable, onSave, advice }: GoalCardProps) {
	const { t } = useTranslate();

	let value: ReactNode;
	if (editable && onSave) {
		value = <GoalInput key={goal} goal={goal} onSave={onSave} />;
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
				{advice && (
					<Alert
						type={advice.fit === "fits" ? "success" : "warning"}
						showIcon
						icon={<IconSparkles size={14} />}
						title={advice.note}
						className={styles.goalAdvice}
					/>
				)}
			</div>
		</section>
	);
}

/** Saved on blur or Enter; an emptied or refused goal goes back to what was saved. */
function GoalInput({
	goal,
	onSave,
}: {
	goal: string;
	onSave: (goal: string) => Promise<void>;
}) {
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
			variant="borderless"
			className={`${styles.goalValue} ${styles.goalInput}`}
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
