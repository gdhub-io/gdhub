"use client";

import {
	IconArrowDown,
	IconArrowRight,
	IconCalendarEvent,
	IconCalendarPlus,
	IconHourglass,
	IconLock,
	IconSparkles,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Segmented, Tabs, Tooltip } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { GoalCard } from "@/components/checkpoints/CallRoom/CallGoal";
import { NotesSummary } from "@/components/checkpoints/CallRoom/CallNotes";
import { CallLayout } from "@/components/checkpoints/CallRoom/CallParts";
import {
	adviceSlots,
	PlanBody,
	usePlanChange,
} from "@/components/checkpoints/CallRoom/CallPlan";
import callStyles from "@/components/checkpoints/CallRoom/style.module.scss";
import { entryHubHref } from "@/components/checkpoints/entry/hrefs";
import { EmptyState } from "@/components/ui";
import { FINAL_SESSION, SCOPE_SESSION } from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
	CheckpointVerdict,
} from "@/config/prisma-enums";
import { trackCheckpoint } from "@/helpers/gtm";
import { useAdvisePlan, useCheckpointReview } from "@/hooks/checkpoint-review";
import { type PlanEdit, planSession } from "@/lib/checkpoint-call";
import type { CheckpointReviewDto } from "@/repositories/checkpoint-review";
import type { PlanChange } from "@/schemas/checkpoint";
import { CuratorAside } from "./CuratorAside";
import { CuratorHeader } from "./CuratorHeader";
import { type CuratorAction, CuratorMessage } from "./CuratorMessage";
import { CuratorReviewSkeleton } from "./CuratorReviewSkeleton";
import { PreviousVerdict } from "./PreviousVerdict";
import styles from "./style.module.scss";

/** Where "Review the tasks" takes the author. */
const PLAN_ANCHOR = "curator-plan";

type AiTab = "plan" | "review";

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

	const loaded = !!review;
	useEffect(() => {
		if (!loaded) return;
		trackCheckpoint(
			"checkpoint_review_opened",
			{ session_index: index, curator_kind: "ai" },
			{ once: `review_opened:${checkpointId}:${index}` },
		);
	}, [loaded, checkpointId, index]);

	// The start greets the team with suggestions before anything is saved.
	const greeted = useRef(false);
	const greet = review?.plan.edit === "plan" && !sessionOf(review, 1)?.content;
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
	onAdvise: () => void;
	advising: boolean;
	/** The Workflow sidebar; the stories leave it out. */
	aside?: ReactNode;
};

/** The page itself, from its data: what the stories render, moment by moment. */
export function AiReviewView({
	review,
	index,
	backHref,
	onChange,
	onAdvise,
	advising,
	aside,
}: AiReviewViewProps) {
	const { t } = useTranslate();
	const [picked, setPicked] = useState<number | null>(null);
	const [pickedTab, setTab] = useState<AiTab | null>(null);
	const { plan, current } = review;
	const editing = planSession(plan.edit);
	// The open plan first; a session still ahead never, whatever the link asked for.
	const selected = picked ?? editing ?? Math.min(index, current);
	// Review by default; the start and sprint 2's review are where the plan is changed.
	const tab =
		pickedTab ??
		(current === 1 || selected === 1 || selected === SCOPE_SESSION
			? "plan"
			: "review");
	const reviewTasks = () => {
		if (editing) setPicked(editing);
		setTab("plan");
		requestAnimationFrame(() =>
			document
				.getElementById(PLAN_ANCHOR)
				?.scrollIntoView({ behavior: "smooth", block: "start" }),
		);
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
					onReviewTasks={plan.edit ? reviewTasks : null}
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
					<GoalCard goal={plan.goal} editable={false} />
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
											advice={
												editing
													? sessionOf(review, editing)?.content?.advice
													: null
											}
											hint={planHint(t, plan.edit)}
											{...adviceSlots({
												until: plan.editUntil,
												loading: advising,
												onAdvise,
												sessionIndex: selected,
											})}
										/>
									),
								},
								{
									key: "review",
									label: t("checkpoints.call.panel.review", "Review"),
									children: <ReviewBody review={review} index={selected} />,
								},
							]}
						/>
					</section>
				</>
			}
		/>
	);
}

/** Day 15's ask; the start's is the plan editor's own. */
const planHint = (t: ReturnType<typeof useTranslate>["t"], edit: PlanEdit) =>
	edit === "tasks"
		? t(
				"checkpoints.review.plan.midHint",
				"Change the tasks yourself or take the curator's suggestions. This is the last change in this checkpoint: done tasks stay as they are, and the first wording of each task is kept.",
			)
		: undefined;

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
		<div className={styles.switcher}>
			<Segmented<number>
				value={selected}
				onChange={onSelect}
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
						label = t(
							"checkpoints.review.option.sprint",
							"Sprint {n} · {date}",
							{ n: session.index - 1, date },
						);
					}
					const ahead = session.index > review.current;
					return {
						value: session.index,
						disabled: ahead,
						label: ahead ? (
							<Tooltip
								title={t(
									"checkpoints.review.option.ahead",
									"This review is still ahead",
								)}
							>
								<span className={styles.lockedOption}>
									<IconLock size={14} />
									{label}
								</span>
							</Tooltip>
						) : (
							label
						),
					};
				})}
			/>
		</div>
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

/** The curator's latest letter, and the buttons for what it asks now. */
function Message({
	review,
	onReviewTasks,
}: {
	review: CheckpointReviewDto;
	onReviewTasks: (() => void) | null;
}) {
	const { t } = useTranslate();
	const router = useRouter();
	const workflow = `/user/project/${review.project.slug}/workflow`;
	const session = sessionOf(review, review.current);
	const final = review.current === FINAL_SESSION;

	const actions: CuratorAction[] = [];
	// The curator points at the tasks; the author decides on them there.
	if (onReviewTasks) {
		actions.push({
			key: "tasks",
			label: t("checkpoints.review.action.reviewTasks", "Review the tasks"),
			icon: <IconArrowDown size={16} />,
			primary: true,
			onClick: onReviewTasks,
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
			date={dayjs(session?.scheduledAt).format("D MMM")}
			message={session?.content?.message ?? fallbackMessage(t, review)}
			verdict={final ? review.verdict?.verdict : null}
			actions={actions}
		/>
	);
}

/** Before the curator has written: what it is doing, in its own voice. */
const fallbackMessage = (
	t: ReturnType<typeof useTranslate>["t"],
	review: CheckpointReviewDto,
) => {
	if (review.current === 1) {
		return t(
			"checkpoints.review.message.greeting",
			"Hi, team! I'm the AI curator of {project} for the next 28 days. Let's start with the tasks that get you to the goal — when you save them, I'll tell you which are clear, which are risky for four weeks, and which are too vague to check.",
			{ project: review.project.name },
		);
	}
	return t(
		"checkpoints.review.message.reading",
		"The sprint is over. I'm reading the devlog, the new artifacts and the team's pulse now. The review will be here soon — you'll get a letter when it's ready.",
	);
};
