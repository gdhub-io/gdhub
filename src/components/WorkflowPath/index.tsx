import {
	IconFlag,
	IconHistory,
	IconSelector,
	IconShieldCheck,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Alert, Button, Divider, Flex, Modal, Typography } from "antd";
import axios from "axios";
import { type ReactNode, useEffect, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { CheckpointStatus, CheckpointVerdict } from "@/config/prisma-enums";
import { gtmEventTrigger, trackCheckpoint } from "@/helpers/gtm";
import { useCheckpoint, useCheckpoints } from "@/hooks/checkpoints";
import { isPending, isRunning } from "@/lib/checkpoints/status";
import { verdictDueBy } from "@/lib/checkpoints/verdict-window";
import { AfterVerdict } from "./AfterVerdict";
import { CheckpointOffer } from "./CheckpointOffer";
import { ClosedCheckpoint } from "./ClosedCheckpoint";
import { CuratorAccepted } from "./CuratorAccepted";
import { formatDay, formatDayRange, formatShort } from "./dates";
import { PathBranch, PathNode } from "./PathNode";
import { RunningCheckpoint } from "./RunningCheckpoint";
import { StageCard } from "./StageCard";
import styles from "./style.module.scss";
import { useProjectWorkflow, WorkflowAside } from "./WorkflowAside";

const { Text } = Typography;

export type WorkflowPathProps = {
	project: { id: string; name: string; slug: string };
};

/**
 * The project's Workflow tab: the whole road top to bottom — the stages, the
 * checkpoints between them and, inside the running one, its sprints. Frames
 * 01, 02 and 07–09 of the Workflow row in platform-design.pen.
 */
export function WorkflowPath({ project }: WorkflowPathProps) {
	const { t } = useTranslate();
	const { can } = useAccess();
	const canMove = can("project.workflow.edit");
	// How many stages behind the current one are open. Each "Show earlier"
	// opens one more; null is the running-checkpoint default, nothing behind.
	const [behind, setBehind] = useState<number | null>(null);
	// Open while a move is confirmed; holds which button asked for it.
	const [confirm, setConfirm] = useState<{ afterVerdict: boolean }>();
	const [earlierOpen, setEarlierOpen] = useState(false);

	const { data: workflow, refetch } = useProjectWorkflow(project.id);
	const { data: list } = useCheckpoints(
		can("project.checkpoints.view") ? project.id : undefined,
	);
	const running =
		list?.current && isRunning(list.current.status) ? list.current : null;
	const { data: detail } = useCheckpoint(running?.id);
	// A draft, or one paid and waiting on its curator: shown as the offer card.
	const pending =
		list?.current && isPending(list.current.status) ? list.current : null;
	const canManage = can("project.checkpoints.manage");
	// Until purchase opens the offer still shows, its button locked.
	const locked = list?.blocker?.reason === "purchaseClosed";
	const offered =
		can("project.checkpoints.create") &&
		(!!pending || !!list?.canCreate || locked);
	// The checkpoint whose "On your own" this viewer chose; a per-browser convenience.
	const ownKey = `gd.workflow.own.${project.id}`;
	const [ownFor, setOwnFor] = useState<string | null>(null);
	useEffect(() => {
		try {
			setOwnFor(localStorage.getItem(ownKey));
		} catch {}
	}, [ownKey]);

	const move = useMutation({
		mutationFn: (_move: { afterVerdict: boolean }) =>
			axios.put("/api/project/move", {
				projectId: project.id,
				direction: "next",
			}),
		onSuccess: (_data, { afterVerdict }) => {
			trackCheckpoint("checkpoint_stage_moved", {
				after_verdict: afterVerdict,
			});
			refetch();
		},
	});

	if (!workflow) return null;

	const steps = [...workflow.steps].sort((a, b) => a.order - b.order);
	const current = workflow.currentStep;
	const stepName = (index: number) =>
		t(`workflow.${workflow.title}.step${index + 1}.name`, steps[index].name);

	// Numbered through the project in the order they ran; drafts and cancelled
	// ones never took a number.
	const numbered = (list?.closed.rows ?? [])
		.filter((row) => row.status === CheckpointStatus.Closed)
		.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
		.map((checkpoint, index) => ({ checkpoint, number: index + 1 }));
	const previous = numbered.at(-1) ?? null;
	// Just closed on this stage and nothing started since: the author chooses how to go on.
	const afterVerdict =
		previous &&
		offered &&
		!pending &&
		!running &&
		previous.checkpoint.stepId === current.id &&
		ownFor !== previous.checkpoint.id
			? previous
			: null;
	const goOwn = (checkpointId: string) => {
		setOwnFor(checkpointId);
		try {
			localStorage.setItem(ownKey, checkpointId);
		} catch {}
	};

	// A running checkpoint holds the stage until its verdict (GDHUB-37).
	const heldBy =
		running && detail?.dueAt
			? {
					number: String(detail.number ?? 1),
					date: formatShort(verdictDueBy(detail.dueAt).toISOString()),
				}
			: null;
	const requiredOpen = current.tasks.some(
		(task) => task.required && !task.done,
	);
	// Once a checkpoint ran on this stage, one of them has to approve the move.
	const stageVerdicts = (list?.closed.rows ?? []).filter(
		(row) => row.stepId === current.id && row.verdict,
	);
	const notApproved =
		stageVerdicts.length > 0 &&
		!stageVerdicts.some((row) => row.verdict === CheckpointVerdict.StageClosed);
	const nextStep = steps[current.order + 1];
	const lockedReason = heldBy
		? t(
				"workflow.path.stage.held",
				"Opens after the Checkpoint {number} verdict · by {date}",
				heldBy,
			)
		: requiredOpen
			? t("workflow.path.stage.locked", "Finish the required tasks to move on")
			: notApproved
				? t(
						"workflow.path.stage.notApproved",
						"Opens when a checkpoint on this stage ends with Ready for the next stage",
					)
				: null;
	const currentName = stepName(current.order);
	const nextName = nextStep ? stepName(nextStep.order) : "";
	const goNext = (afterVerdict: boolean) => setConfirm({ afterVerdict });

	const hereLabel = (
		<span className={styles.here}>
			<IconShieldCheck size={16} />
			{t("workflow.path.here", "You are here")}
		</span>
	);
	const here = (label: ReactNode, extra?: ReactNode) => (
		<div className={styles.hereRow}>
			{label}
			{extra}
		</div>
	);
	// Frame 08: once a sprint is behind, the label moves down to the sprint
	// under way and the top row keeps only the way back.
	const sprintBehind = !!detail?.sprints?.some(
		(sprint) => sprint.state === "done",
	);

	const historyButton = (label: string, onClick: () => void) => (
		<Button
			type="text"
			size="small"
			className={styles.quiet}
			icon={<IconHistory size={16} />}
			onClick={onClick}
		>
			{label}
		</Button>
	);
	const historyToggle = historyButton(
		behind !== null
			? t("workflow.path.history.hide", "Hide previous path")
			: t("workflow.path.history.show", "Show previous path"),
		() => setBehind(behind === null ? 1 : null),
	);
	const historyRow = (
		button: ReactNode,
		rail: "solid" | "dashed" = "dashed",
	) => (
		<PathNode marker="none" rail={rail} space={12}>
			<div className={styles.earlier}>{button}</div>
		</PathNode>
	);

	const closedOn = (stepId: string) =>
		numbered.filter(({ checkpoint }) => checkpoint.stepId === stepId);
	// On the current stage only the latest stays in view, so what is under way
	// is not pushed below the fold; the older ones open behind one line.
	const closedNodes = (stepId: string, fold = false) => {
		const rows = closedOn(stepId).filter(
			({ checkpoint }) => checkpoint.id !== afterVerdict?.checkpoint.id,
		);
		const kept = afterVerdict?.checkpoint.stepId === stepId ? 0 : 1;
		const hidden = fold && !earlierOpen ? Math.max(0, rows.length - kept) : 0;

		return [
			hidden > 0 && (
				<PathNode key="earlier" marker="none" space={12}>
					<Divider plain>
						<Button
							type="text"
							size="small"
							icon={<IconSelector size={14} />}
							className={styles.boundaryLabel}
							onClick={() => setEarlierOpen(true)}
						>
							{t(
								"workflow.path.earlierCheckpoints",
								"{count, plural, one {# earlier checkpoint} other {# earlier checkpoints}}",
								{ count: hidden },
							)}
						</Button>
					</Divider>
				</PathNode>
			),
			...rows.slice(hidden).map(({ checkpoint, number }) => (
				<PathNode key={checkpoint.id} marker="cleared" offset={18}>
					<ClosedCheckpoint
						checkpoint={checkpoint}
						number={number}
						projectSlug={project.slug}
					/>
				</PathNode>
			)),
		];
	};

	// A stage starts when the project moves onto it (plannedAt is stamped then)
	// and ends when it finishes or the next one starts.
	const stageDates = (index: number, state: "done" | "current" | "ahead") => {
		const from = steps[index].plannedAt;
		if (!from || state === "ahead") return null;
		if (state === "current")
			return t("workflow.path.stage.since", "since {date}", {
				date: formatDay(String(from)),
			});
		const to = steps[index].finishedAt ?? steps[index + 1]?.plannedAt;
		return to
			? formatDayRange(String(from), String(to))
			: formatDay(String(from));
	};

	const stageCard = (index: number) => {
		const step = steps[index];
		const state =
			step.order < current.order
				? "done"
				: step.order === current.order
					? "current"
					: "ahead";

		return (
			<StageCard
				step={step}
				title={stepName(index)}
				state={state}
				dates={stageDates(index, state)}
				next={
					state === "current" && canMove && nextStep
						? {
								onClick: () => goNext(false),
								loading: move.isPending,
								lockedReason,
							}
						: undefined
				}
			/>
		);
	};

	// With a checkpoint running the page is about its sprints; what led here
	// folds behind one button, and opens one stage back at a time. Without one,
	// the stage just behind stays in view.
	const shown = behind ?? (running ? 0 : 1);
	const historyVisible = !running || behind !== null;
	const firstShown = Math.max(0, current.order - shown);
	// The road leads to a released game: support and completion come into view
	// only once the project is past it.
	const named = steps.findIndex((step) => /release/i.test(step.name));
	const releaseIndex = named >= 0 ? named : steps.length - 3;
	const beforeRelease = current.order <= releaseIndex;
	const showNext =
		!!nextStep && (!beforeRelease || nextStep.order <= releaseIndex);

	const currentStage = (
		<PathNode marker="stageCurrent" start={current.order === 0}>
			{stageCard(current.order)}
		</PathNode>
	);

	return (
		<div className={styles.layout}>
			{/* It answers the one who chose the curator, not the whole team. */}
			{running && detail && canManage && (
				<CuratorAccepted checkpoint={detail} />
			)}
			<div>
				{historyVisible &&
					firstShown > 0 &&
					historyRow(
						historyButton(
							t("workflow.path.history.earlier", "Show earlier stages"),
							() => setBehind(shown + 1),
						),
					)}
				{historyVisible &&
					steps.slice(firstShown, current.order).flatMap((step) => [
						<PathNode key={step.id} marker="stageDone" start={step.order === 0}>
							{stageCard(step.order)}
						</PathNode>,
						closedOn(step.id).length > 0 && (
							<PathBranch key={`${step.id}-branch`}>
								{closedNodes(step.id)}
							</PathBranch>
						),
					])}

				{running && detail ? (
					<>
						{/* Shown or hidden, the way back sits right above the stage. */}
						{historyRow(historyToggle, historyVisible ? "solid" : "dashed")}
						{/* The stage stays in view with a checkpoint running on it: it is
						    what the sprints below are working through. */}
						{currentStage}
						<PathBranch ahead>
							{historyVisible && closedNodes(current.id, true)}
							{detail.startedAt && (
								<PathNode marker="none" space={12}>
									<Divider plain>
										<span className={styles.boundaryLabel}>
											<IconFlag size={14} />
											{t(
												"workflow.path.checkpoint.dayOne",
												"Checkpoint {number} · day 1 · {date}",
												{
													number: String(detail.number ?? 1),
													date: formatShort(detail.startedAt),
												},
											)}
										</span>
									</Divider>
								</PathNode>
							)}
							{!sprintBehind && (
								<PathNode marker="none" space={12}>
									{here(hereLabel)}
								</PathNode>
							)}
							<RunningCheckpoint
								checkpoint={detail}
								project={project}
								previous={previous}
								canManage={canManage}
								here={sprintBehind ? hereLabel : null}
							/>
						</PathBranch>
					</>
				) : (
					<>
						<PathNode marker="none" space={12}>
							{/* Opened past the stage just behind: offer the way back to it. */}
							{here(hereLabel, behind !== null ? historyToggle : null)}
						</PathNode>
						{currentStage}
						{(offered || closedOn(current.id).length > 0) && (
							<PathBranch ahead pending={closedOn(current.id).length === 0}>
								{closedNodes(current.id, true)}
								{afterVerdict && (
									<PathNode marker="cleared">
										<AfterVerdict
											checkpoint={afterVerdict.checkpoint}
											number={afterVerdict.number}
											project={project}
											locked={locked}
											onOwn={() => goOwn(afterVerdict.checkpoint.id)}
											move={
												afterVerdict.checkpoint.verdict ===
													CheckpointVerdict.StageClosed &&
												canMove &&
												nextStep
													? {
															stage: nextName,
															onClick: () => goNext(true),
															loading: move.isPending,
															lockedReason,
														}
													: undefined
											}
										/>
									</PathNode>
								)}
								{offered && !afterVerdict && (
									<PathNode marker="none" rail="dashed" space={0}>
										<CheckpointOffer
											project={project}
											draft={pending}
											previous={previous}
											locked={locked}
										/>
									</PathNode>
								)}
							</PathBranch>
						)}
					</>
				)}

				{showNext && (
					<PathNode marker="todo" rail={beforeRelease ? "dashed" : "none"}>
						{stageCard(nextStep.order)}
					</PathNode>
				)}
				{beforeRelease && (
					<PathNode marker="todo" rail="none" offset={0} space={0}>
						<div className={styles.finish}>
							{t("workflow.path.release", "Release")}
						</div>
					</PathNode>
				)}
			</div>

			<WorkflowAside projectId={project.id} checkpointId={running?.id} />

			{/* Frames 02.5 and 02.5b: the path runs one way, so every move is confirmed. */}
			<Modal
				centered
				title={t("workflow.move.title", "Move to {stage}?", {
					stage: nextName,
				})}
				open={!!confirm}
				okText={t("workflow.move.ok", "Move to {stage}", { stage: nextName })}
				cancelText={t("workflow.move.cancel", "Stay on {stage}", {
					stage: currentName,
				})}
				onOk={async () => {
					if (confirm) {
						await move.mutateAsync(confirm);
						gtmEventTrigger("workflow_move", {
							projectId: project.id,
							direction: "next",
							currentStep: current.name,
							nextStep: nextStep?.name,
						});
					}
					setConfirm(undefined);
				}}
				onCancel={() => setConfirm(undefined)}
				confirmLoading={move.isPending}
			>
				<Flex vertical gap={12}>
					<Text>
						{t(
							"workflow.move.description",
							"The project's stage changes from {from} to {to}.",
							{ from: currentName, to: nextName },
						)}
					</Text>
					<Alert
						type="info"
						showIcon
						message={t(
							"workflow.move.oneWay",
							"There is no way back: the path runs one way. Past stages and checkpoints stay in the history.",
						)}
					/>
					{!!current.equityPromises?.length && (
						<Flex vertical gap={6} className={styles.moveEquity}>
							<Text type="secondary" strong>
								{t(
									"workflow.move.equity",
									"These equity promises become allocations:",
								)}
							</Text>
							{current.equityPromises.map((promise) => (
								<Text key={promise.id}>
									{t(
										"workflow.move.equityRow",
										"{name}: +{percentage}% · total {total}%",
										{
											name: promise.allocation.owner.name ?? "",
											percentage: String(promise.percentage),
											total: String(
												promise.allocation.percentage + promise.percentage,
											),
										},
									)}
								</Text>
							))}
						</Flex>
					)}
				</Flex>
			</Modal>
		</div>
	);
}
