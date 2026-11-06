"use client";

import { IconCheck } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import type { EvidenceActions } from "@/components/checkpoints/AttachEvidenceModal/useEvidencePicker";
import { CHECKPOINT_MAX_ITEMS_PER_KIND } from "@/config/checkpoint";
import { trackCheckpoint } from "@/helpers/gtm";
import { useChangePlan } from "@/hooks/checkpoint-call";
import type { PlanChange } from "@/schemas/checkpoint";
import type { PlanAdvice, TaskSuggestion } from "@/types/checkpoints";
import { PlanForm } from "./PlanForm";
import { PlanView } from "./PlanView";
import type { Plan } from "./plan-types";
import styles from "./style.module.scss";

export { TaskIcon } from "./TaskIcon";

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
	/** Add or let go of the artifacts that prove a task; absent for whoever may not. */
	evidence?: EvidenceActions;
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
	evidence,
}: PlanBodyProps) {
	const { t } = useTranslate();
	const { edit } = plan;
	let lead = hint;
	if (lead === undefined && (edit === "plan" || edit === "goalAndTasks")) {
		// The first sprint reads the same with either curator.
		lead = t(
			"checkpoints.review.plan.startLine",
			"3–{max} tasks for 4 weeks, each ending in a build, a document or a video anyone can open.",
			{ max: CHECKPOINT_MAX_ITEMS_PER_KIND },
		);
	} else if (lead === undefined && edit === "tasks") {
		lead = t(
			"checkpoints.call.plan.callThreeLine",
			"Last change in this checkpoint: done tasks stay, and the goal stays as agreed on call 1.",
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
				/>
			) : (
				<PlanView plan={plan} evidence={evidence} />
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

/** "Save changes": the tasks save as typed; this asks the AI for its read. */
export function AdviseFooter({
	until,
	loading,
	onAdvise,
	sessionIndex,
}: {
	until: string | null;
	loading: boolean;
	onAdvise: () => void;
	sessionIndex: number;
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
			<Button
				type="primary"
				loading={loading}
				onClick={() => {
					trackCheckpoint("checkpoint_plan_saved", {
						session_index: sessionIndex,
					});
					onAdvise();
				}}
			>
				{t("checkpoints.review.plan.save", "Save changes")}
			</Button>
		</div>
	);
}
