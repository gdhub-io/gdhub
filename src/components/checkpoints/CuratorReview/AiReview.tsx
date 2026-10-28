"use client";

import {
	IconArrowDown,
	IconArrowRight,
	IconCalendarEvent,
	IconCalendarPlus,
	IconHourglass,
	IconSparkles,
} from "@tabler/icons-react";
import type { QueryKey } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Button, Tabs, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { GoalCard } from "@/components/checkpoints/CallRoom/CallGoal";
import { NotesSummary } from "@/components/checkpoints/CallRoom/CallNotes";
import { CallLayout } from "@/components/checkpoints/CallRoom/CallParts";
import {
	PlanBody,
	usePlanChange,
} from "@/components/checkpoints/CallRoom/CallPlan";
import { SessionSwitcher } from "@/components/checkpoints/CallRoom/SessionSwitcher";
import callStyles from "@/components/checkpoints/CallRoom/style.module.scss";
import { entryHubHref } from "@/components/checkpoints/entry/hrefs";
import { EmptyState } from "@/components/ui";
import { SprintTab } from "@/components/WorkflowPath/SprintTab";
import {
	AI_APPROVE_HOURS,
	FINAL_SESSION,
	SCOPE_SESSION,
} from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
	CheckpointVerdict,
} from "@/config/prisma-enums";
import { trackCheckpoint } from "@/helpers/gtm";
import {
	useAdvisePlan,
	useApprovePlan,
	useCheckpointReview,
} from "@/hooks/checkpoint-review";
import { type PlanEdit, planSession } from "@/lib/checkpoint-call";
import type { CheckpointReviewDto } from "@/repositories/checkpoint-review";
import type { PlanChange } from "@/schemas/checkpoint";
import { CuratorAside } from "./CuratorAside";
import { CuratorHeader } from "./CuratorHeader";
import { type CuratorAction, CuratorMessage } from "./CuratorMessage";
import { CuratorReviewSkeleton } from "./CuratorReviewSkeleton";
import { PreviousVerdict } from "./PreviousVerdict";
import { useCuratorNow } from "./useCuratorNow";

/** Where "Review the tasks" takes the author. */
const PLAN_ANCHOR = "curator-plan";

type AiTab = "plan" | "review" | "sprint";

export type AiReviewProps = {
	checkpointId: string;
	index: number;
	backHref: string;
};

/**
 * Curator's Review with the AI curator, laid out as the call room (frames
 * 10.1–10.5). The curator's message, the goal and the open plan are always the
 * checkpoint's moment now; the switcher changes only its own panel — the
 * start, the three sprint reviews, the verdict. `index` picks what the panel
 * opens on, as a letter's link does.
 */
export function AiReview({ checkpointId, index, backHref }: AiReviewProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { data: review, isPending } = useCheckpointReview(checkpointId);
	const onChange = usePlanChange(checkpointId);
	const advise = useAdvisePlan(checkpointId);
	const approve = useApprovePlan(checkpointId);

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

	const loaded = !!review;
	useEffect(() => {
		if (!loaded) return;
		trackCheckpoint(
			"checkpoint_review_opened",
			{ session_index: index, curator_kind: "ai" },
			{ once: `review_opened:${checkpointId}:${index}` },
		);
	}, [loaded, checkpointId, index]);

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
		<AiReviewView
			review={review}
			index={index}
			backHref={backHref}
			onChange={onChange}
			onAdvise={askAdvice}
			advising={advise.isPending}
			onApprove={approvePlan}
			approving={approve.isPending}
			refreshKey={["checkpoint-review", checkpointId]}
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
	);
}

export type AiReviewViewProps = {
	review: CheckpointReviewDto;
	/** The session the panel opens on, as the link asked. */
	index: number;
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
}: AiReviewViewProps) {
	const { t } = useTranslate();
	const [picked, setPicked] = useState<number | null>(null);
	const [pickedTab, setTab] = useState<AiTab | null>(null);
	const { plan, current } = review;
	const editing = planSession(plan.edit);
	const open = editing ? sessionOf(review, editing)?.content : null;
	// The open plan first; a session still ahead never, whatever the link asked for.
	const selected = picked ?? editing ?? Math.min(index, current);
	// Review by default; the start and sprint 2's review are where the plan is changed.
	const tab =
		pickedTab ??
		(current === 1 || selected === 1 || selected === SCOPE_SESSION
			? "plan"
			: "review");
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
							tabBarExtraContent={{
								right: (
									<ReviewSwitcher
										review={review}
										selected={selected}
										onSelect={setPicked}
									/>
								),
							}}
							size="large"
							className={callStyles.panelTabs}
							items={[
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
								{
									key: "review",
									label: t("checkpoints.call.panel.review", "Review"),
									children: <ReviewBody review={review} index={selected} />,
								},
								...(sprintTab
									? [
											{
												key: "sprint",
												label: t("checkpoints.call.panel.sprint", "Sprint"),
												children: sprintTab(selected),
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

const planHint = (t: ReturnType<typeof useTranslate>["t"], edit: PlanEdit) => {
	if (edit === "goalAndTasks") {
		return t(
			"checkpoints.review.plan.dayOneHint",
			"Write 1 to 5 tasks that will show the goal is reached. Each one should end in something anyone can open: a build, a document, a video. Add the curator's suggestions or write your own.",
		);
	}
	if (edit === "tasks") {
		return t(
			"checkpoints.review.plan.midHint",
			"Change the tasks yourself or take the curator's suggestions, then confirm them. This is the last change in this checkpoint: done tasks stay as they are, and the first wording of each task is kept.",
		);
	}
	return undefined;
};

/**
 * Under the open plan: on day 1, "Save and send to the curator" (frame
 * 12.10.1, its confirm 12.10.1c) and, once checked, "Approve the plan"
 * (12.10.1b); on day 15, confirming the tasks.
 */
function PlanFooter({
	plan,
	checked,
	advising,
	onSend,
	approving,
	onApprove,
}: {
	plan: CheckpointReviewDto["plan"];
	checked: boolean;
	advising: boolean;
	onSend: () => void;
	approving: boolean;
	onApprove: () => void;
}) {
	const { t } = useTranslate();
	const { modal } = App.useApp();
	const until = plan.editUntil && dayjs(plan.editUntil).format("D MMM, HH:mm");
	const empty = !plan.tasks.some((task) => !task.cut);

	let note: string;
	let button: ReactNode;
	if (plan.edit === "goalAndTasks" && !checked) {
		note = t(
			"checkpoints.review.plan.openUntilSent",
			"Open until you send the tasks",
		);
		const send = (
			<Button
				type="primary"
				loading={advising}
				disabled={empty}
				onClick={() =>
					modal.confirm({
						title: t(
							"checkpoints.review.plan.sendTitle",
							"Send the tasks to the curator?",
						),
						content: t(
							"checkpoints.review.plan.sendBody",
							"The curator reads the goal and the tasks and writes what to keep, shorten or reword. You then have {hours} more hours to adjust them.",
							{ hours: AI_APPROVE_HOURS },
						),
						okText: t("checkpoints.review.plan.sendOk", "Save and send"),
						cancelText: t(
							"checkpoints.review.plan.keepEditing",
							"Keep editing",
						),
						onOk: () => {
							trackCheckpoint("checkpoint_plan_saved", { session_index: 1 });
							onSend();
						},
					})
				}
			>
				{t("checkpoints.review.plan.send", "Save and send to the curator")}
			</Button>
		);
		button = empty ? (
			<Tooltip
				title={t("checkpoints.review.plan.addOne", "Add at least one task")}
			>
				{send}
			</Tooltip>
		) : (
			send
		);
	} else {
		const dayOne = plan.edit === "goalAndTasks";
		note = dayOne
			? t(
					"checkpoints.review.plan.checkedNote",
					"The curator checked your plan · adjust it if needed and approve · approves itself on {date}",
					{ date: until },
				)
			: t(
					"checkpoints.review.plan.confirmNote",
					"Open until {date} · then the tasks stay as they are",
					{ date: until },
				);
		button = (
			<Button
				type="primary"
				loading={approving}
				disabled={dayOne && empty}
				onClick={onApprove}
			>
				{dayOne
					? t("checkpoints.review.plan.approve", "Approve the plan")
					: t("checkpoints.review.plan.confirm", "Confirm the tasks")}
			</Button>
		);
	}

	return (
		<div className={callStyles.planFooter}>
			<Typography.Text type="secondary" className={callStyles.grow}>
				{note}
			</Typography.Text>
			{button}
		</div>
	);
}

const sessionOf = (review: CheckpointReviewDto, index: number) =>
	review.sessions.find((session) => session.index === index);

/** Start · Sprint 1–3 · Verdict; the ones still ahead are locked. */
function ReviewSwitcher({
	review,
	selected,
	onSelect,
}: {
	review: CheckpointReviewDto;
	selected: number;
	onSelect: (index: number) => void;
}) {
	const { t } = useTranslate();

	return (
		<SessionSwitcher
			value={selected}
			onChange={onSelect}
			aheadLabel={t(
				"checkpoints.review.option.ahead",
				"This review is still ahead",
			)}
			options={review.sessions.map((session) => {
				const date = dayjs(session.scheduledAt).format("D MMM");
				let label: string;
				if (session.index === 1) {
					label = t("checkpoints.review.option.start", "Start · {date}", {
						date,
					});
				} else if (session.index === FINAL_SESSION) {
					label = t("checkpoints.review.option.verdict", "Verdict · {date}", {
						date,
					});
				} else {
					label = t("checkpoints.review.option.sprint", "Sprint {n} · {date}", {
						n: session.index - 1,
						date,
					});
				}
				return {
					value: session.index,
					label,
					ahead: session.index > review.current,
				};
			})}
		/>
	);
}

/** 10.3 / 10.4 when written, 10.2 while on its way. */
function ReviewBody({
	review,
	index,
}: {
	review: CheckpointReviewDto;
	index: number;
}) {
	const { t } = useTranslate();
	const session = sessionOf(review, index);
	const notes = session?.content?.notes;

	// Sprint 1 has no review: the first is written once it has ended.
	if (index === 1) {
		const first = sessionOf(review, 2)?.scheduledAt;
		return (
			<EmptyState
				size="compact"
				icon={IconCalendarEvent}
				title={t(
					"checkpoints.review.firstSprintTitle",
					"No review in the first sprint",
				)}
				description={t(
					"checkpoints.review.firstSprintText",
					"Sprint 1 is for the work itself. On {date} the AI curator writes the first review, from what the sprint showed: the devlog, the artifacts and the team's pulse.",
					{ date: dayjs(first).format("D MMM") },
				)}
			/>
		);
	}

	if (
		session?.contentStatus !== CheckpointSessionContentStatus.Ready ||
		!notes
	) {
		return (
			<EmptyState
				size="compact"
				icon={IconHourglass}
				title={t(
					"checkpoints.review.pendingTitle",
					"The Sprint {n} review is on its way",
					{ n: index - 1 },
				)}
				description={t(
					"checkpoints.review.pendingText",
					"The AI curator reads the sprint's devlog, artifacts and activity. Ready on the review day — we'll email you.",
				)}
			/>
		);
	}
	return (
		<NotesSummary index={index} content={notes} plan={review.plan} review />
	);
}

/** What the curator says now, and the buttons for what it asks (GDHUB-117). */
function Message({
	review,
	refreshKey,
	onShowPlan,
	onShowReview,
}: {
	review: CheckpointReviewDto;
	refreshKey: QueryKey | null;
	onShowPlan: () => void;
	onShowReview: (index: number) => void;
}) {
	const { t } = useTranslate();
	const router = useRouter();
	const workflow = `/user/project/${review.project.slug}/workflow`;
	const now = review.curatorNow;
	const said = useCuratorNow(now, refreshKey);
	const final = review.current === FINAL_SESSION;

	const actions: CuratorAction[] = [];
	if (said?.action && now) {
		const asks = said.action === "tasks";
		actions.push({
			key: said.action,
			label: said.label ?? "",
			icon: <IconArrowDown size={16} />,
			primary: asks,
			onClick:
				said.action === "review" || said.action === "verdict"
					? () => onShowReview(now.index)
					: onShowPlan,
		});
	}
	if (final && review.verdict) {
		const { nextStage } = review;
		if (review.verdict.verdict === CheckpointVerdict.StageClosed && nextStage) {
			actions.push({
				key: "move",
				label: t("checkpoints.review.action.move", "Move to {stage}", {
					stage: t(nextStage.key, nextStage.name),
				}),
				icon: <IconArrowRight size={16} />,
				primary: true,
				// The path moves it, with its equity and required-task checks.
				onClick: () => router.push(workflow),
			});
		}
		actions.push({
			key: "next",
			label: t("checkpoints.review.action.plan", "Plan Checkpoint {n}", {
				n: review.number + 1,
			}),
			icon: <IconCalendarPlus size={16} />,
			onClick: () => router.push(entryHubHref(review.project.slug)),
		});
	}

	return (
		<CuratorMessage
			character={review.character}
			date={dayjs(now?.at ?? review.startedAt).format("D MMM")}
			message={said?.message ?? ""}
			extra={
				said?.deadline && (
					<Typography.Text type="secondary">{said.deadline}</Typography.Text>
				)
			}
			verdict={final ? review.verdict?.verdict : null}
			actions={actions}
		/>
	);
}
