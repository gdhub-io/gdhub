"use client";

import { IconPlus, IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tooltip, Typography } from "antd";
import { type ReactNode, useRef, useState } from "react";
import { ArtifactLinks } from "@/components/WorkflowPath/ArtifactLink";
import { CHECKPOINT_MAX_ITEMS_PER_KIND } from "@/config/checkpoint";
import type {
	PlanAdvice,
	TaskAdvice,
	TaskSuggestion,
} from "@/types/checkpoints";
import type { PlanBodyProps } from "./CallPlan";
import { Field } from "./Field";
import type { Plan, Task } from "./plan-types";
import styles from "./style.module.scss";
import { TaskIcon } from "./TaskIcon";
import { TaskInput } from "./TaskInput";

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

export function PlanForm({
	plan,
	onChange,
	advice,
	suggestions = [],
	listAction,
	blank,
}: {
	plan: Plan;
	onChange: PlanBodyProps["onChange"];
	advice?: PlanAdvice | null;
	suggestions?: TaskSuggestion[];
	listAction?: ReactNode;
	blank?: boolean;
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
			<div className={`${styles.planList} ${styles.planForm}`}>
				{plan.tasks.map((task) => (
					<TaskRow
						key={task.id}
						task={task}
						onChange={onChange}
						advice={advice?.tasks.find((row) => row.itemId === task.id)}
					/>
				))}
				{[
					...suggestions,
					...(advice?.add ?? []).map((text) => ({ text, why: null })),
				]
					.filter(({ text }) => !plan.tasks.some((task) => task.text === text))
					.map(({ text, why }) => (
						<SuggestedTask
							key={text}
							text={text}
							why={why}
							disabled={full}
							onAdd={() => onChange({ op: "add", text })}
						/>
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
				{blank && !full && (
					<TaskInput
						// A fresh field once the one typed into is saved as a task.
						key={`blank-${plan.tasks.length}`}
						text=""
						placeholder={t(
							"checkpoints.call.plan.ownTask",
							"Write a task of your own…",
						)}
						onSave={(text) => onChange({ op: "add", text })}
					/>
				)}
				<div className={styles.listActions}>
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
					{listAction}
				</div>
			</div>
		</Field>
	);
}

function TaskRow({
	task,
	onChange,
	advice,
}: {
	task: Task;
	onChange: PlanBodyProps["onChange"];
	advice?: TaskAdvice;
}) {
	const { t } = useTranslate();

	if (task.artifacts.length) {
		return (
			<LockedRow
				icon={<TaskIcon task={task} />}
				end={<ArtifactLinks artifacts={task.artifacts} />}
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

	const remove = () =>
		onChange({ op: "remove", itemId: task.id }).catch(() => undefined);
	const input = (
		<TaskInput
			key={task.text}
			text={task.text}
			warning={!!advice && WARNING_KINDS.has(advice.kind)}
			onSave={(text) => onChange({ op: "edit", itemId: task.id, text })}
			onRemove={remove}
			removeLabel={t("checkpoints.call.plan.removeTask", "Remove task")}
		/>
	);
	// Taken already: the line has nothing left to say until the plan is read again.
	if (!advice || advice.suggestion === task.text) return input;

	const suggestion = advice.suggestion?.replace(/[.\s]+$/, "");

	return (
		<div className={styles.advisedTask}>
			{input}
			<AdviceLine>
				{suggestion
					? t(
							"checkpoints.review.plan.adviceTry",
							"{note} Try: “{suggestion}”.",
							{
								note: advice.note,
								suggestion,
							},
						)
					: advice.note}
			</AdviceLine>
		</div>
	);
}

/**
 * The AI curator's word under a task, marked as its own: advice to read, not
 * a button — the author decides and edits the task themselves.
 */
function AdviceLine({ children }: { children: ReactNode }) {
	return (
		<div className={styles.advice}>
			<IconSparkles size={14} className={styles.adviceIcon} />
			<Typography.Text className={styles.adviceText}>
				{children}
			</Typography.Text>
		</div>
	);
}

/** A task the AI curator proposes adding: frame r5hAR, with its why on day 1. */
function SuggestedTask({
	text,
	why,
	disabled,
	onAdd,
}: {
	text: string;
	why: string | null;
	disabled: boolean;
	onAdd: () => Promise<void>;
}) {
	const { t } = useTranslate();

	const row = (
		<div className={styles.lockedRow}>
			<IconSparkles size={16} className={styles.tertiary} />
			<span className={styles.grow}>{text}</span>
			<Button
				type="text"
				size="small"
				disabled={disabled}
				onClick={() => onAdd().catch(() => undefined)}
			>
				{t("checkpoints.review.plan.add", "Add")}
			</Button>
		</div>
	);
	if (!why) return row;

	return (
		<div className={styles.advisedTask}>
			{row}
			<Typography.Text type="secondary" className={styles.why}>
				{t("checkpoints.review.plan.why", "Why: {why}", { why })}
			</Typography.Text>
		</div>
	);
}

/** The curator's advice that asks for a change marks its task. */
const WARNING_KINDS = new Set<TaskAdvice["kind"]>([
	"risky",
	"vague",
	"shorten",
	"cut",
]);
