"use client";

import { IconPencil, IconSparkles, IconTarget } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Alert, Button, Flex, Input, Tooltip, Typography } from "antd";
import { type ReactNode, useState } from "react";
import { IconTile } from "@/components/ui";
import { CHECKPOINT_GOAL_MAX } from "@/config/checkpoint";
import type { CheckpointCallDto } from "@/types/checkpoint-call";
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

/** Frame CUPxr: read the same on every sprint; while the goal may change, a pencil opens it in place. */
export function GoalCard({ goal, editable, onSave, advice }: GoalCardProps) {
	const { t } = useTranslate();
	const [editing, setEditing] = useState(false);
	const canEdit = editable && !!onSave;

	let value: ReactNode;
	if (editing && onSave) {
		value = (
			<GoalEditor
				goal={goal}
				onSave={(next) => onSave(next).then(() => setEditing(false))}
				onCancel={() => setEditing(false)}
			/>
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
			{canEdit && !editing && (
				<Tooltip title={t("checkpoints.call.goal.edit", "Edit the goal")}>
					<Button
						icon={<IconPencil size={16} />}
						aria-label={t("checkpoints.call.goal.edit", "Edit the goal")}
						onClick={() => setEditing(true)}
					/>
				</Tooltip>
			)}
		</section>
	);
}

/** Frame CUPxr on day 1: the goal reworded in place, kept only on Save. */
function GoalEditor({
	goal,
	onSave,
	onCancel,
}: {
	goal: string;
	onSave: (goal: string) => Promise<void>;
	onCancel: () => void;
}) {
	const { t } = useTranslate();
	const [value, setValue] = useState(goal);
	const [saving, setSaving] = useState(false);
	const next = value.trim();

	const save = () => {
		setSaving(true);
		onSave(next).catch(() => setSaving(false));
	};

	return (
		<Flex vertical gap="small">
			<Input.TextArea
				autoFocus
				value={value}
				autoSize={{ minRows: 2 }}
				maxLength={CHECKPOINT_GOAL_MAX}
				onChange={(event) => setValue(event.target.value)}
			/>
			<Flex gap="small">
				<Button
					type="primary"
					loading={saving}
					disabled={!next || next === goal}
					onClick={save}
				>
					{t("checkpoints.call.goal.save", "Save")}
				</Button>
				<Button onClick={onCancel}>
					{t("checkpoints.call.goal.cancel", "Cancel")}
				</Button>
			</Flex>
		</Flex>
	);
}
