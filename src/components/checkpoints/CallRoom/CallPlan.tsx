"use client";

import {
	IconCheck,
	IconCircle,
	IconCircleCheck,
	IconPlus,
	IconX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Input, Tooltip, Typography } from "antd";
import axios from "axios";
import { type ReactNode, useRef, useState } from "react";
import { ArtifactLink } from "@/components/WorkflowPath/ArtifactLink";
import {
	CHECKPOINT_ITEM_TEXT_MAX,
	CHECKPOINT_MAX_ITEMS_PER_KIND,
} from "@/config/checkpoint";
import { useChangePlan } from "@/hooks/checkpoint-call";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import type { PlanChange } from "@/schemas/checkpoint";
import styles from "./style.module.scss";

type Plan = CheckpointCallDto["plan"];
type Task = Plan["tasks"][number];

/**
 * One change to the plan, a refusal said in words. The goal card and the plan
 * tab both save through it.
 */
export function usePlanChange(checkpointId: string) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const change = useChangePlan(checkpointId);

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

	return (next: PlanChange) =>
		change.mutateAsync(next).catch((error: unknown) => {
			const reason = axios.isAxiosError(error)
				? (error.response?.data as { error?: string } | undefined)?.error
				: undefined;
			message.error(refusalMessage(reason));
			throw error;
		});
}

export type PlanBodyProps = {
	plan: Plan;
	/** Settles once the change is saved and the plan re-read; rejects on refusal. */
	onChange: (change: PlanChange) => Promise<void>;
};

/** The Plan tab: frames Ovz5i (call 3), NBWf6 (call 1) and, without inputs, NBTnm. */
export function PlanBody({ plan, onChange }: PlanBodyProps) {
	const { t } = useTranslate();
	const { edit } = plan;

	return (
		<div className={styles.tabBody}>
			{edit === "tasks" && (
				<Typography.Text type="secondary">
					{t(
						"checkpoints.call.plan.callThreeHint",
						"This is the last time the tasks can change in this checkpoint. Done tasks stay as they are; the goal stays as agreed on call 1.",
					)}
				</Typography.Text>
			)}
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
		</div>
	);
}

/** Done once an artifact closes it; cut and open tasks share the empty circle. */
export function TaskIcon({ task }: { task: Task }) {
	return task.artifact ? (
		<IconCircleCheck size={16} className={styles.success} />
	) : (
		<IconCircle size={16} className={styles.tertiary} />
	);
}

function Field({
	label,
	extra,
	children,
}: {
	label: string;
	extra?: string;
	children: ReactNode;
}) {
	return (
		<div className={styles.planField}>
			<div className={styles.fieldLabel}>
				<Typography.Text type="secondary" className={styles.small}>
					{label}
				</Typography.Text>
				{extra && (
					<Typography.Text className={`${styles.small} ${styles.tertiary}`}>
						{extra}
					</Typography.Text>
				)}
			</div>
			{children}
		</div>
	);
}

/** Read-only: another call than this one, and anyone on the team but the author. */
function PlanView({ plan }: { plan: Plan }) {
	const { t } = useTranslate();
	const kept = plan.tasks.filter((task) => !task.cut);
	const done = kept.filter((task) => task.artifact).length;

	return (
		<Field
			label={t("checkpoints.call.plan.tasks", "Tasks")}
			extra={
				kept.length
					? t("checkpoints.call.plan.doneCount", "{done} of {total} done", {
							done,
							total: kept.length,
						})
					: undefined
			}
		>
			{plan.tasks.length ? (
				<div className={styles.planList}>
					{plan.tasks.map((task) => (
						<div key={task.id} className={styles.taskLine}>
							<TaskIcon task={task} />
							<Typography.Text
								delete={task.cut}
								type={task.cut || task.artifact ? "secondary" : undefined}
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
	);
}

/** A task that can no longer change: done or cut. */
function LockedRow({
	icon,
	children,
	end,
}: {
	icon: ReactNode;
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
	onChange: PlanBodyProps["onChange"];
}) {
	const { t } = useTranslate();
	const [drafts, setDrafts] = useState<number[]>([]);
	const nextDraft = useRef(0);
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
	);
}

function TaskRow({
	task,
	onChange,
}: {
	task: Task;
	onChange: PlanBodyProps["onChange"];
}) {
	const { t } = useTranslate();

	if (task.artifact) {
		return (
			<LockedRow
				icon={<TaskIcon task={task} />}
				end={<ArtifactLink artifact={task.artifact} />}
			>
				{task.text}
			</LockedRow>
		);
	}
	if (task.cut) {
		return (
			<LockedRow icon={<TaskIcon task={task} />}>
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
