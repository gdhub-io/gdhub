"use client";

import {
	IconCheck,
	IconCircle,
	IconCircleCheck,
	IconPaperclip,
	IconPlus,
	IconSparkles,
	IconX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Input, Tooltip, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { type ReactNode, useRef, useState } from "react";
import { ArtifactLink } from "@/components/WorkflowPath/ArtifactLink";
import {
	CHECKPOINT_ITEM_TEXT_MAX,
	CHECKPOINT_MAX_ITEMS_PER_KIND,
} from "@/config/checkpoint";
import { trackCheckpoint } from "@/helpers/gtm";
import { useChangePlan } from "@/hooks/checkpoint-call";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import type { PlanChange } from "@/schemas/checkpoint";
import type {
	PlanAdvice,
	TaskAdvice,
	TaskSuggestion,
} from "@/types/checkpoints";
import styles from "./style.module.scss";

/** What the plan editor needs, from a call or from an AI review page. */
type Plan = Pick<CheckpointCallDto["plan"], "edit" | "tasks">;
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
	/** The AI curator's read of the tasks, shown under each one. */
	advice?: PlanAdvice | null;
	/** Day 1: the tasks the AI curator suggests, each with why. */
	suggestions?: TaskSuggestion[];
	/** Above the tasks while they can change; call 3's rule by default. */
	hint?: ReactNode;
	/** Under the tasks while they can change; "saved as you type" by default. */
	footer?: ReactNode;
	/** Beside "Add task": the AI's "Suggest tasks". */
	listAction?: ReactNode;
	/** An empty task field always open above "Add task" (frame kezVq). */
	blank?: boolean;
	/** Attach an artifact that proves a task; absent for whoever may not. */
	onAttach?: () => void;
};

/**
 * The Plan tab: frames Ovz5i (call 3), NBWf6 (call 1) and, without inputs,
 * NBTnm. The AI review page (10.1, 10.5) brings its own hint, footer and advice.
 */
export function PlanBody({
	plan,
	onChange,
	advice,
	suggestions,
	hint,
	footer,
	listAction,
	blank,
	onAttach,
}: PlanBodyProps) {
	const { t } = useTranslate();
	const { edit } = plan;
	let lead = hint;
	if (lead === undefined && (edit === "plan" || edit === "goalAndTasks")) {
		// The first sprint reads the same with either curator.
		lead = t(
			"checkpoints.review.plan.startHint",
			"Set 3–5 tasks that get you to the goal in 4 weeks. Each one should end in something anyone can open: a build, a document, a video. Take the curator's suggestions or write your own.",
		);
	} else if (lead === undefined && edit === "tasks") {
		lead = t(
			"checkpoints.call.plan.callThreeHint",
			"This is the last time the tasks can change in this checkpoint. Done tasks stay as they are; the goal stays as agreed on call 1.",
		);
	}

	return (
		<div className={styles.tabBody}>
			{edit && lead && (
				<Typography.Text type="secondary">{lead}</Typography.Text>
			)}
			{edit ? (
				<PlanForm
					plan={plan}
					onChange={onChange}
					advice={advice}
					suggestions={suggestions}
					listAction={listAction}
					blank={blank}
				/>
			) : (
				<PlanView plan={plan} onAttach={onAttach} />
			)}
			{edit &&
				(footer ?? (
					<div className={styles.planFooter}>
						<IconCheck size={14} className={styles.success} />
						<Typography.Text type="secondary" className={styles.small}>
							{t(
								"checkpoints.call.plan.saved",
								"Saved as you type · the team sees this plan on Workflow",
							)}
						</Typography.Text>
					</div>
				))}
		</div>
	);
}

/**
 * The AI's two ways in, for any plan it reads: "Suggest tasks" beside "Add
 * task", and "Save changes" — the tasks save as typed; this asks for the read.
 */
export const adviceSlots = ({
	until,
	loading,
	onAdvise,
	sessionIndex,
}: {
	until: string | null;
	loading: boolean;
	onAdvise: () => void;
	sessionIndex: number;
}): Pick<PlanBodyProps, "listAction" | "footer"> => ({
	listAction: <SuggestTasks loading={loading} onClick={onAdvise} />,
	footer: (
		<AdviseFooter
			until={until}
			loading={loading}
			onClick={() => {
				trackCheckpoint("checkpoint_plan_saved", {
					session_index: sessionIndex,
				});
				onAdvise();
			}}
		/>
	),
});

function SuggestTasks({
	loading,
	onClick,
}: {
	loading: boolean;
	onClick: () => void;
}) {
	const { t } = useTranslate();
	return (
		<Button
			type="text"
			icon={<IconSparkles size={16} />}
			loading={loading}
			onClick={onClick}
			className={styles.suggestTasks}
		>
			{t("checkpoints.review.plan.suggest", "Suggest tasks")}
		</Button>
	);
}

function AdviseFooter({
	until,
	loading,
	onClick,
}: {
	until: string | null;
	loading: boolean;
	onClick: () => void;
}) {
	const { t } = useTranslate();
	return (
		<div className={styles.planFooter}>
			<Typography.Text type="secondary" className={styles.grow}>
				{until &&
					t("checkpoints.review.plan.until", "Open until {date}", {
						date: dayjs(until).format("ddd D MMM, HH:mm"),
					})}
			</Typography.Text>
			<Button type="primary" loading={loading} onClick={onClick}>
				{t("checkpoints.review.plan.save", "Save changes")}
			</Button>
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
function PlanView({ plan, onAttach }: { plan: Plan; onAttach?: () => void }) {
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
							{task.artifact ? (
								<ArtifactLink artifact={task.artifact} />
							) : (
								onAttach &&
								!task.cut && (
									<Tooltip
										title={t("workflow.aside.attach", "Attach an artifact")}
									>
										<Button
											type="text"
											size="small"
											icon={<IconPaperclip size={16} />}
											aria-label={t(
												"workflow.aside.attach",
												"Attach an artifact",
											)}
											onClick={onAttach}
										/>
									</Tooltip>
								)
							)}
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

/** Saved on blur or Enter; an emptied or refused field goes back to what was saved. */
function TaskInput({
	text,
	placeholder,
	autoFocus,
	warning,
	onSave,
	onEmpty,
	onRemove,
	removeLabel,
}: {
	text: string;
	placeholder?: string;
	autoFocus?: boolean;
	warning?: boolean;
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
			placeholder={placeholder}
			autoFocus={autoFocus}
			status={warning ? "warning" : undefined}
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
