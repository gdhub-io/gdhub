"use client";

import {
	IconInfoCircle,
	IconLock,
	IconPlus,
	IconSparkles,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Input, Tooltip, Typography } from "antd";
import { type ReactNode, useState } from "react";
import { SectionHeading } from "@/components/ui";
import { ArtifactLinks } from "@/components/WorkflowPath/ArtifactLink";
import { CHECKPOINT_MAX_ITEMS_PER_KIND } from "@/config/checkpoint";
import type {
	PlanAdvice,
	TaskAdvice,
	TaskSuggestion,
} from "@/types/checkpoints";
import type { PlanBodyProps } from "./CallPlan";
import type { Plan, Task } from "./plan-types";
import styles from "./style.module.scss";
import { TaskIcon } from "./TaskIcon";
import { TaskInput, taskFieldProps } from "./TaskInput";

/** A row that is not an input: a done or cut task, or a suggested one. */
function LockedRow({
	icon,
	children,
	end,
	className,
}: {
	icon: ReactNode;
	children: ReactNode;
	end?: ReactNode;
	className?: string;
}) {
	return (
		<div className={`${styles.lockedRow} ${className ?? ""}`}>
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
}: {
	plan: Plan;
	onChange: PlanBodyProps["onChange"];
	advice?: PlanAdvice | null;
	suggestions?: TaskSuggestion[];
}) {
	const { t } = useTranslate();
	const full =
		plan.tasks.filter((task) => !task.cut).length >=
		CHECKPOINT_MAX_ITEMS_PER_KIND;
	const recommended = [
		...suggestions,
		...(advice?.add ?? []).map((text) => ({ text, why: null })),
	].filter(({ text }) => !plan.tasks.some((task) => task.text === text));

	return (
		<div className={styles.planSections}>
			<div className={`${styles.planList} ${styles.planForm}`}>
				<SectionHeading
					level={4}
					title={t("checkpoints.call.plan.tasks", "Tasks")}
				/>
				{plan.tasks.map((task) => (
					<TaskRow
						key={task.id}
						task={task}
						onChange={onChange}
						advice={advice?.tasks.find((row) => row.itemId === task.id)}
					/>
				))}
				<NewTask full={full} onAdd={(text) => onChange({ op: "add", text })} />
			</div>
			{recommended.length > 0 && (
				<div
					className={`${styles.planList} ${styles.planForm} ${styles.recommended}`}
				>
					<SectionHeading
						level={4}
						title={t(
							"checkpoints.review.plan.recommended",
							"Recommended tasks",
						)}
						description={t(
							"checkpoints.review.plan.recommendedNote",
							"The curator's ideas. None is in your plan until you add it.",
						)}
					/>
					{recommended.map(({ text, why }) => (
						<SuggestedTask
							key={text}
							text={text}
							why={why}
							disabled={full}
							onAdd={() => onChange({ op: "add", text })}
						/>
					))}
				</div>
			)}
		</div>
	);
}

/** Frame kezVq: the author's own task, typed and added with the button or Enter. */
function NewTask({
	full,
	onAdd,
}: {
	full: boolean;
	onAdd: (text: string) => Promise<void>;
}) {
	const { t } = useTranslate();
	const [value, setValue] = useState("");
	const [saving, setSaving] = useState(false);
	const text = value.trim();

	const add = () => {
		if (!text || saving) return;
		setSaving(true);
		onAdd(text)
			.then(() => setValue(""))
			.catch(() => undefined)
			.finally(() => setSaving(false));
	};

	return (
		<>
			<Input
				value={value}
				{...taskFieldProps}
				disabled={full}
				placeholder={t(
					"checkpoints.call.plan.newTask",
					"Write a task: what you will make, and where anyone can open it…",
				)}
				onChange={(event) => setValue(event.target.value)}
				onPressEnter={add}
			/>
			<Tooltip
				title={
					full &&
					t(
						"checkpoints.call.plan.tooMany",
						"A checkpoint holds at most {max} tasks",
						{ max: CHECKPOINT_MAX_ITEMS_PER_KIND },
					)
				}
			>
				<Button
					icon={full ? <IconLock size={16} /> : <IconPlus size={16} />}
					disabled={full || !text}
					loading={saving}
					onClick={add}
					className={styles.addTask}
				>
					{t("checkpoints.call.plan.addTask", "Add task")}
				</Button>
			</Tooltip>
		</>
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
export function AdviceLine({ children }: { children: ReactNode }) {
	return (
		<div className={styles.advice}>
			<IconSparkles size={14} className={styles.adviceIcon} />
			<Typography.Text className={styles.adviceText}>
				{children}
			</Typography.Text>
		</div>
	);
}

/** A task the AI curator proposes adding: frame r5hAR, its why behind a button. */
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

	return (
		<LockedRow
			className={styles.suggested}
			icon={<IconSparkles size={16} className={styles.tertiary} />}
			end={
				<>
					{why && (
						<Tooltip title={why}>
							<Button
								type="text"
								size="small"
								icon={<IconInfoCircle size={14} />}
								className={styles.secondary}
							>
								{t("checkpoints.review.plan.whyButton", "Why")}
							</Button>
						</Tooltip>
					)}
					<Button
						type="text"
						size="small"
						icon={<IconPlus size={14} />}
						disabled={disabled}
						onClick={() => onAdd().catch(() => undefined)}
					>
						{t("checkpoints.review.plan.add", "Add")}
					</Button>
				</>
			}
		>
			{text}
		</LockedRow>
	);
}

/** The curator's advice that asks for a change marks its task. */
const WARNING_KINDS = new Set<TaskAdvice["kind"]>([
	"risky",
	"vague",
	"shorten",
	"cut",
	"offGoal",
]);
