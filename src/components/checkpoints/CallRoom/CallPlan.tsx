"use client";

import {
	IconCheck,
	IconCircle,
	IconCircleCheck,
	IconLock,
	IconPlus,
	IconX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Input, Tooltip, Typography } from "antd";
import axios from "axios";
import { type ReactNode, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui";
import { ArtifactLink } from "@/components/WorkflowPath/ArtifactLink";
import {
	CHECKPOINT_GOAL_MAX,
	CHECKPOINT_ITEM_TEXT_MAX,
	CHECKPOINT_MAX_ITEMS_PER_KIND,
} from "@/config/checkpoint";
import { useChangePlan } from "@/hooks/checkpoint-call";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import type { PlanChange } from "@/schemas/checkpoint";
import styles from "./style.module.scss";

type Plan = CheckpointCallDto["plan"];
type Task = Plan["tasks"][number];

/** The call's plan, saved field by field through the plan endpoint. */
export function CallPlan({ call }: { call: CheckpointCallDto }) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const change = useChangePlan(call.checkpointId);

	const refusalMessage = (reason: string | undefined) => {
		switch (reason) {
			case "planClosed":
				return t(
					"checkpoints.call.plan.closed",
					"The plan can no longer change",
				);
			case "tooManyTasks":
				return t(
					"checkpoints.call.plan.tooMany",
					"A checkpoint holds at most {max} tasks",
					{ max: CHECKPOINT_MAX_ITEMS_PER_KIND },
				);
			default:
				return t("checkpoints.call.plan.failed", "The change was not saved");
		}
	};

	const onChange = (next: PlanChange) =>
		change.mutateAsync(next).catch((error: unknown) => {
			const reason = axios.isAxiosError(error)
				? (error.response?.data as { error?: string } | undefined)?.error
				: undefined;
			message.error(refusalMessage(reason));
			throw error;
		});

	return (
		<PlanBlock
			plan={call.plan}
			curatorName={call.curator.name.trim().split(/\s+/)[0] ?? ""}
			onChange={onChange}
		/>
	);
}

export type PlanBlockProps = {
	plan: Plan;
	curatorName: string;
	/** Settles once the change is saved and the plan re-read; rejects on refusal. */
	onChange: (change: PlanChange) => Promise<void>;
};

/** Frames 08.6 (call 1), 08.7 (call 3) and, without inputs, every other call. */
export function PlanBlock({ plan, curatorName, onChange }: PlanBlockProps) {
	const { t } = useTranslate();
	const { edit } = plan;

	let description: string | undefined;
	if (edit === "goalAndTasks") {
		description = t(
			"checkpoints.call.plan.callOneHint",
			"Agree the goal and the checkpoint tasks with {curator} on this call. The goal locks when the call ends; tasks can change once more on call 3.",
			{ curator: curatorName },
		);
	} else if (edit === "tasks") {
		description = t(
			"checkpoints.call.plan.callThreeHint",
			"This is the last time the tasks can change in this checkpoint. Done tasks stay as they are; the goal stays as agreed on call 1.",
		);
	}

	return (
		<section className={styles.panel}>
			<SectionHeading
				level={3}
				title={t("checkpoints.call.plan.title", "Checkpoint plan")}
				description={description}
			/>
			{edit ? (
				<PlanForm plan={plan} onChange={onChange} />
			) : (
				<PlanView plan={plan} />
			)}
			{edit && (
				<div className={styles.planFooter}>
					<IconCheck size={14} className={styles.success} />
					<Typography.Text type="secondary" className={styles.small}>
						{t(
							"checkpoints.call.plan.saved",
							"Saved as you type · the team sees this plan on Workflow",
						)}
					</Typography.Text>
				</div>
			)}
		</section>
	);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className={styles.planField}>
			<Typography.Text type="secondary" className={styles.small}>
				{label}
			</Typography.Text>
			{children}
		</div>
	);
}

/** Read-only: calls 2, 4 and 5, and anyone on the team but the author. */
function PlanView({ plan }: { plan: Plan }) {
	const { t } = useTranslate();

	return (
		<>
			<Field label={t("checkpoints.call.plan.goal", "Goal")}>
				{plan.goal ? (
					<Typography.Text>{plan.goal}</Typography.Text>
				) : (
					<Typography.Text type="secondary">
						{t("checkpoints.call.plan.noGoal", "No goal agreed yet.")}
					</Typography.Text>
				)}
			</Field>
			<Field label={t("checkpoints.call.plan.tasks", "Tasks")}>
				{plan.tasks.length ? (
					<div className={styles.planList}>
						{plan.tasks.map((task) => (
							<div key={task.id} className={styles.taskLine}>
								{task.artifact ? (
									<IconCircleCheck size={16} className={styles.success} />
								) : (
									<IconCircle size={16} className={styles.tertiary} />
								)}
								<Typography.Text
									delete={task.cut}
									type={task.cut ? "secondary" : undefined}
									className={styles.grow}
								>
									{task.text}
								</Typography.Text>
								{task.artifact && <ArtifactLink artifact={task.artifact} />}
							</div>
						))}
					</div>
				) : (
					<Typography.Text type="secondary">
						{t("checkpoints.call.plan.noTasks", "No tasks yet.")}
					</Typography.Text>
				)}
			</Field>
		</>
	);
}

/** A field that can no longer change: the locked goal, a done or a cut task. */
function LockedRow({
	icon,
	children,
	end,
}: {
	icon?: ReactNode;
	children: ReactNode;
	end?: ReactNode;
}) {
	return (
		<div className={styles.lockedRow}>
			{icon}
			<span className={styles.grow}>{children}</span>
			{end}
		</div>
	);
}

function PlanForm({
	plan,
	onChange,
}: {
	plan: Plan;
	onChange: PlanBlockProps["onChange"];
}) {
	const { t } = useTranslate();
	const [drafts, setDrafts] = useState<number[]>([]);
	const nextDraft = useRef(0);
	const goalLocked = plan.edit === "tasks";
	const full =
		plan.tasks.length + drafts.length >= CHECKPOINT_MAX_ITEMS_PER_KIND;

	const addDraft = () => {
		nextDraft.current += 1;
		setDrafts((was) => [...was, nextDraft.current]);
	};
	const dropDraft = (draft: number) =>
		setDrafts((was) => was.filter((key) => key !== draft));

	const addButton = (
		<Button
			type="text"
			icon={<IconPlus size={16} />}
			disabled={full}
			onClick={addDraft}
			className={styles.addTask}
		>
			{t("checkpoints.call.plan.addTask", "Add task")}
		</Button>
	);

	return (
		<>
			{goalLocked ? (
				<Field
					label={t(
						"checkpoints.call.plan.goalAgreed",
						"Goal · agreed on call 1",
					)}
				>
					<LockedRow end={<IconLock size={16} className={styles.tertiary} />}>
						{plan.goal}
					</LockedRow>
				</Field>
			) : (
				<Field label={t("checkpoints.call.plan.goal", "Goal")}>
					<GoalInput
						key={plan.goal}
						goal={plan.goal}
						onSave={(goal) => onChange({ op: "goal", goal })}
					/>
				</Field>
			)}

			<Field label={t("checkpoints.call.plan.tasks", "Tasks")}>
				<div className={styles.planList}>
					{plan.tasks.map((task) => (
						<TaskRow key={task.id} task={task} onChange={onChange} />
					))}
					{drafts.map((draft) => (
						<TaskInput
							key={`draft-${draft}`}
							text=""
							autoFocus
							onSave={(text) =>
								onChange({ op: "add", text }).then(() => dropDraft(draft))
							}
							onEmpty={() => dropDraft(draft)}
						/>
					))}
					{full ? (
						<Tooltip
							title={t(
								"checkpoints.call.plan.tooMany",
								"A checkpoint holds at most {max} tasks",
								{ max: CHECKPOINT_MAX_ITEMS_PER_KIND },
							)}
						>
							{addButton}
						</Tooltip>
					) : (
						addButton
					)}
				</div>
			</Field>
		</>
	);
}

function TaskRow({
	task,
	onChange,
}: {
	task: Task;
	onChange: PlanBlockProps["onChange"];
}) {
	const { t } = useTranslate();

	if (task.artifact) {
		return (
			<LockedRow
				icon={<IconCircleCheck size={16} className={styles.success} />}
				end={<ArtifactLink artifact={task.artifact} />}
			>
				{task.text}
			</LockedRow>
		);
	}
	if (task.cut) {
		return (
			<LockedRow icon={<IconCircle size={16} className={styles.tertiary} />}>
				<Typography.Text delete type="secondary">
					{task.text}
				</Typography.Text>
			</LockedRow>
		);
	}

	return (
		<TaskInput
			key={task.text}
			text={task.text}
			onSave={(text) => onChange({ op: "edit", itemId: task.id, text })}
			onRemove={() =>
				onChange({ op: "remove", itemId: task.id }).catch(() => undefined)
			}
			removeLabel={t("checkpoints.call.plan.removeTask", "Remove task")}
		/>
	);
}

/** Saved on blur or Enter; an emptied or refused field goes back to what was saved. */
function TaskInput({
	text,
	autoFocus,
	onSave,
	onEmpty,
	onRemove,
	removeLabel,
}: {
	text: string;
	autoFocus?: boolean;
	onSave: (text: string) => Promise<void>;
	onEmpty?: () => void;
	onRemove?: () => void;
	removeLabel?: string;
}) {
	const [value, setValue] = useState(text);

	const commit = () => {
		const next = value.trim();
		if (!next) {
			setValue(text);
			onEmpty?.();
			return;
		}
		if (next === text) return;
		onSave(next).catch(() => setValue(text));
	};

	return (
		<Input
			value={value}
			autoFocus={autoFocus}
			maxLength={CHECKPOINT_ITEM_TEXT_MAX}
			onChange={(event) => setValue(event.target.value)}
			onBlur={commit}
			onPressEnter={(event) => event.currentTarget.blur()}
			suffix={
				onRemove && (
					<Tooltip title={removeLabel}>
						<Button
							type="text"
							size="small"
							aria-label={removeLabel}
							icon={<IconX size={14} />}
							onClick={onRemove}
						/>
					</Tooltip>
				)
			}
		/>
	);
}

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
