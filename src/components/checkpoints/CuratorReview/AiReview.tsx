"use client";

import { IconSparkles } from "@tabler/icons-react";
import type { QueryKey } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Tabs } from "antd";
import dayjs from "dayjs";
import { type ReactNode, useEffect, useRef } from "react";
import {
	type EvidenceActions,
	useEvidencePicker,
} from "@/components/checkpoints/AttachEvidenceModal/useEvidencePicker";
import { GoalCard } from "@/components/checkpoints/CallRoom/CallGoal";
import { CallLayout } from "@/components/checkpoints/CallRoom/CallParts";
import {
	PlanBody,
	usePlanChange,
} from "@/components/checkpoints/CallRoom/CallPlan";
import callStyles from "@/components/checkpoints/CallRoom/style.module.scss";
import { CheckpointCalendar } from "@/components/checkpoints/CheckpointCalendar";
import { EmptyState } from "@/components/ui";
import { SprintTab } from "@/components/WorkflowPath/SprintTab";
import { SCOPE_SESSION } from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { trackCheckpoint } from "@/helpers/gtm";
import {
	useAdvisePlan,
	useApprovePlan,
	useCheckpointReview,
} from "@/hooks/checkpoint-review";
import { useAddressPick } from "@/hooks/useAddressPick";
import { planSession } from "@/lib/checkpoints/call";
import { type PathTab, sprintParam } from "@/lib/checkpoints/hrefs";
import type { PlanChange } from "@/schemas/checkpoint";
import type { CheckpointReviewDto } from "@/types/checkpoints";
import { CuratorAside } from "./CuratorAside";
import { CuratorHeader } from "./CuratorHeader";
import { CuratorReviewSkeleton } from "./CuratorReviewSkeleton";
import { Message } from "./Message";
import { PlanFooter } from "./PlanFooter";
import { PreviousVerdict } from "./PreviousVerdict";
import { planHint } from "./plan-hint";
import { ReviewBody } from "./ReviewBody";
import { ReviewSwitcher } from "./ReviewSwitcher";
import { sessionOf } from "./session-of";

/** Where "Review the tasks" takes the author. */
const PLAN_ANCHOR = "curator-plan";

const AI_TABS = ["plan", "review", "sprint", "calendar"] as const;
type AiTab = (typeof AI_TABS)[number];

export type AiReviewProps = {
	checkpointId: string;
	/** The sprint the address names; without one, the open plan or the one under way. */
	index?: number;
	backHref: string;
	tab?: PathTab;
};

/**
 * Curator's Review with the AI curator, laid out as the call room (frames
 * 10.1–10.5). The curator's message, the goal and the open plan are always the
 * checkpoint's moment now; the switcher changes only its own panel — the
 * start, the three sprint reviews, the verdict.
 */
export function AiReview({
	checkpointId,
	index,
	backHref,
	tab,
}: AiReviewProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { data: review, isPending } = useCheckpointReview(checkpointId);
	const onChange = usePlanChange(checkpointId);
	const advise = useAdvisePlan(checkpointId);
	const approve = useApprovePlan(checkpointId);
	const evidence = useEvidencePicker(checkpointId);

	const askAdvice = () =>
		advise.mutate(undefined, {
			onError: () =>
				message.error(
					t(
						"checkpoints.review.plan.adviceFailed",
						"The curator could not read the tasks. Try again in a minute.",
					),
				),
		});

	const approvePlan = () =>
		approve.mutate(undefined, {
			onError: () =>
				message.error(
					t(
						"checkpoints.review.plan.approveFailed",
						"The plan was not approved. Try again in a minute.",
					),
				),
		});

	const opened = review && (index ?? review.current);
	useEffect(() => {
		if (!opened) return;
		trackCheckpoint(
			"checkpoint_review_opened",
			{ session_index: opened, curator_kind: "ai" },
			{ once: `review_opened:${checkpointId}:${opened}` },
		);
	}, [opened, checkpointId]);

	// Day 1 without a letter (the read after payment failed) greets on first open.
	const greeted = useRef(false);
	const greet =
		!!review &&
		planSession(review.plan.edit) === 1 &&
		!sessionOf(review, 1)?.content;
	useEffect(() => {
		if (!greet || greeted.current) return;
		greeted.current = true;
		advise.mutate();
	}, [greet, advise]);

	if (isPending) return <CuratorReviewSkeleton />;
	if (!review) {
		return (
			<EmptyState
				icon={IconSparkles}
				description={t(
					"checkpoints.review.missing",
					"This review is not one of yours, or its checkpoint is not run by the AI curator.",
				)}
			/>
		);
	}

	return (
		<>
			<AiReviewView
				checkpointId={checkpointId}
				review={review}
				index={index}
				initialTab={tab}
				syncAddress
				backHref={backHref}
				onChange={onChange}
				onAdvise={askAdvice}
				advising={advise.isPending}
				onApprove={approvePlan}
				approving={approve.isPending}
				refreshKey={["checkpoint-review", checkpointId]}
				evidence={evidence.actions}
				sprintTab={(at) => (
					<SprintTab
						checkpointId={checkpointId}
						index={at}
						project={review.project}
					/>
				)}
				aside={
					<CuratorAside
						projectId={review.project.id}
						checkpointId={checkpointId}
					/>
				}
			/>
			{evidence.modal}
		</>
	);
}

export type AiReviewViewProps = {
	/** The page's own checkpoint: its Calendar tab. The lab and the stories go without. */
	checkpointId?: string;
	review: CheckpointReviewDto;
	/** The session the panel opens on, when the address names one. */
	index?: number;
	backHref: string;
	onChange: (change: PlanChange) => Promise<void>;
	/** Day 1: sends the tasks for the curator's one check. */
	onAdvise: () => void;
	advising: boolean;
	/** Day 1 after the check, and day 15: the author is done with the plan. */
	onApprove: () => void;
	approving: boolean;
	/** The Workflow sidebar; the stories leave it out. */
	aside?: ReactNode;
	/** The query the curator's message is read from, asked again when it is due to change. */
	refreshKey?: QueryKey;
	/** The Sprint tab for a session; the lab and the stories go without it. */
	sprintTab?: (index: number) => ReactNode;
	/** Add or let go of the artifacts that prove a task; absent for whoever may not. */
	evidence?: EvidenceActions;
	/** The tab a link asked for. */
	initialTab?: PathTab;
	/** Keeps the sprint and the tab in the address; the lab and the stories do not. */
	syncAddress?: boolean;
};

/** The page itself, from its data: what the stories render, moment by moment. */
export function AiReviewView({
	review,
	index,
	backHref,
	onChange,
	onAdvise,
	advising,
	onApprove,
	approving,
	aside,
	refreshKey,
	sprintTab,
	evidence,
	initialTab,
	syncAddress,
	checkpointId,
}: AiReviewViewProps) {
	const { t } = useTranslate();
	const [picked, setPicked] = useAddressPick<number>("sprint", index ?? null, {
		toParam: sprintParam,
		sync: syncAddress,
	});
	const [pickedTab, setTab] = useAddressPick<AiTab>(
		"tab",
		AI_TABS.includes(initialTab as AiTab) ? (initialTab as AiTab) : null,
		{ sync: syncAddress },
	);
	const { plan, current } = review;
	const editing = planSession(plan.edit);
	const open = editing ? sessionOf(review, editing)?.content : null;
	// A sprint picked or named in the address, else the open plan; a session still ahead never.
	const selected = Math.min(picked ?? editing ?? current, current);
	// Review by default; the start and sprint 2's review are where the plan is changed.
	const asked =
		pickedTab ??
		(current === 1 || selected === 1 || selected === SCOPE_SESSION
			? "plan"
			: "review");
	// Sprint 1 has no Review tab: nothing is behind it yet.
	const tab = asked === "review" && selected === 1 ? "plan" : asked;
	const scrollToPanel = () =>
		requestAnimationFrame(() =>
			document
				.getElementById(PLAN_ANCHOR)
				?.scrollIntoView({ behavior: "smooth", block: "start" }),
		);
	const reviewTasks = () => {
		if (editing) setPicked(editing);
		setTab("plan");
		scrollToPanel();
	};

	return (
		<CallLayout
			header={
				<CuratorHeader
					backHref={backHref}
					number={review.number}
					kind={CheckpointCuratorKind.AI}
					subtitle={t(
						"checkpoints.review.subtitle",
						"Checkpoint {number} · {stage} · {from} – {to}",
						{
							number: review.number,
							stage: review.stageName,
							from: dayjs(review.startedAt).format("D MMM"),
							to: dayjs(review.dueAt).format("D MMM"),
						},
					)}
				/>
			}
			stage={
				<Message
					review={review}
					refreshKey={refreshKey ?? null}
					onShowPlan={reviewTasks}
					onShowReview={(at) => {
						setPicked(at);
						setTab("review");
						scrollToPanel();
					}}
				/>
			}
			aside={aside}
			below={
				<>
					{review.previous && (
						<PreviousVerdict
							previous={review.previous}
							resultsHref={`/user/project/${review.project.slug}/workflow?results=${review.previous.checkpointId}`}
						/>
					)}
					<GoalCard
						goal={plan.goal}
						editable={plan.edit === "goalAndTasks"}
						onSave={(goal) => onChange({ op: "goal", goal })}
						advice={open?.goal}
					/>
					<section id={PLAN_ANCHOR} className={callStyles.panel}>
						<Tabs
							activeKey={tab}
							onChange={(key) => setTab(key as AiTab)}
							// The calendar is the whole checkpoint, not one sprint.
							tabBarExtraContent={{
								right: tab !== "calendar" && (
									<ReviewSwitcher
										review={review}
										selected={selected}
										onSelect={setPicked}
									/>
								),
							}}
							size="large"
							className={callStyles.panelTabs}
							// What this sprint asks, how the last one went, the whole plan.
							items={[
								...(sprintTab
									? [
											{
												key: "sprint",
												label: t("checkpoints.call.panel.sprint", "Sprint"),
												children: sprintTab(selected),
											},
										]
									: []),
								// The first sprint has nothing behind it to review.
								...(selected > 1
									? [
											{
												key: "review",
												label: t("checkpoints.call.panel.review", "Review"),
												children: (
													<ReviewBody review={review} index={selected} />
												),
											},
										]
									: []),
								{
									key: "plan",
									label: t("checkpoints.call.panel.plan", "Plan"),
									children: (
										<PlanBody
											// One plan; it changes only on the session it is open on.
											plan={
												selected === editing ? plan : { ...plan, edit: null }
											}
											onChange={onChange}
											evidence={evidence}
											advice={open?.advice}
											suggestions={open?.suggestions}
											hint={planHint(t, plan.edit)}
											blank={plan.edit === "goalAndTasks"}
											footer={
												<PlanFooter
													plan={plan}
													checked={plan.checked}
													advising={advising}
													onSend={onAdvise}
													approving={approving}
													onApprove={onApprove}
												/>
											}
										/>
									),
								},
								...(checkpointId
									? [
											{
												key: "calendar",
												label: t("checkpoints.calendar.tab", "Calendar"),
												children: (
													<CheckpointCalendar checkpointId={checkpointId} />
												),
											},
										]
									: []),
							]}
						/>
					</section>
				</>
			}
		/>
	);
}
