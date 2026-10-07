import { IconHistory, IconShieldCheck } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Modal, Typography } from "antd";
import axios from "axios";
import { type ReactNode, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import WorkflowTasksPanel from "@/components/WorkflowContent/WorkflowTasksPanel";
import { CheckpointStatus } from "@/config/prisma-enums";
import { gtmEventTrigger } from "@/helpers/gtm";
import { useCheckpoint, useCheckpoints } from "@/hooks/checkpoints";
import type { ProjectWorkflowWithSteps } from "@/types/workflow";
import { ClosedCheckpoint } from "./ClosedCheckpoint";
import { PathNode } from "./PathNode";
import { RunningCheckpoint } from "./RunningCheckpoint";
import { StageCard } from "./StageCard";
import styles from "./style.module.scss";

const { Text } = Typography;

const RUNNING: CheckpointStatus[] = [
	CheckpointStatus.Active,
	CheckpointStatus.Review,
];

export type WorkflowPathProps = {
	project: { id: string; name: string; slug: string };
	locale?: string;
};

/**
 * The project's Workflow tab: the whole road top to bottom — the stages, the
 * checkpoints between them and, inside the running one, its sprints. Frames
 * 01, 02 and 07–09 of the Workflow row in platform-design.pen.
 */
export function WorkflowPath({ project, locale }: WorkflowPathProps) {
	const { t } = useTranslate();
	const { can } = useAccess();
	const canMove = can("project.workflow.edit");
	const [showHistory, setShowHistory] = useState(false);
	const [equityOpen, setEquityOpen] = useState(false);

	const { data: workflow, refetch } = useQuery({
		queryKey: ["project-workflow", project.id],
		queryFn: async () =>
			(
				await axios.get<ProjectWorkflowWithSteps>(
					"/api/user/project/workflow",
					{
						params: { projectId: project.id },
					},
				)
			).data,
		refetchOnWindowFocus: false,
	});
	const { data: list } = useCheckpoints(
		can("project.checkpoints.view") ? project.id : undefined,
		1,
		50,
	);
	const running =
		list?.current && RUNNING.includes(list.current.status)
			? list.current
			: null;
	const { data: detail } = useCheckpoint(running?.id);

	const move = useMutation({
		mutationFn: (direction: "next") =>
			axios.put("/api/project/move", { projectId: project.id, direction }),
		onSuccess: () => refetch(),
	});

	if (!workflow) return null;

	const steps = [...workflow.steps].sort((a, b) => a.order - b.order);
	const current = workflow.currentStep;
	const stepName = (index: number) =>
		t(`workflow.${workflow.title}.step${index + 1}.name`, steps[index].name);

	// Numbered through the project in the order they ran; drafts and cancelled
	// ones never took a number.
	const ran = (list?.closed.rows ?? [])
		.filter((row) => row.status === CheckpointStatus.Closed)
		.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	const numbered = ran.map((checkpoint, index) => ({
		checkpoint,
		number: index + 1,
	}));
	const previous = numbered.at(-1) ?? null;
	const closedOn = (stepId: string) =>
		numbered.filter(({ checkpoint }) => checkpoint.stepId === stepId);

	const requiredOpen = current.tasks.some(
		(task) => task.required && !task.done,
	);
	const isLast = current.order === steps.length - 1;
	const goNext = () => {
		if (current.equityPromises?.length) {
			setEquityOpen(true);
			return;
		}
		move.mutate("next");
		gtmEventTrigger("workflow_move", {
			projectId: project.id,
			direction: "next",
			currentStep: current.name,
			nextStep: steps[current.order + 1]?.name,
		});
	};

	const here = (extra?: ReactNode) => (
		<div className={styles.hereRow}>
			<span className={styles.here}>
				<IconShieldCheck size={16} />
				{t("workflow.path.here", "You are here")}
			</span>
			{extra}
		</div>
	);

	const historyToggle = (
		<Button
			type="text"
			className={styles.quiet}
			icon={<IconHistory size={16} />}
			onClick={() => setShowHistory((value) => !value)}
		>
			{showHistory
				? t("workflow.path.history.hide", "Hide previous path")
				: t("workflow.path.history.show", "Show previous path")}
		</Button>
	);

	const closedNodes = (stepId: string) =>
		closedOn(stepId).map(({ checkpoint, number }) => (
			<PathNode key={checkpoint.id} marker="cleared">
				<ClosedCheckpoint checkpoint={checkpoint} number={number} />
			</PathNode>
		));

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
				locale={locale}
				tasks={state === "current" ? current.tasks : undefined}
				defaultOpen={state === "current" && !running}
				next={
					state === "current" && canMove && !isLast
						? {
								onClick: goNext,
								loading: move.isPending,
								lockedReason: requiredOpen
									? t(
											"workflow.path.stage.locked",
											"Finish the required tasks to move on",
										)
									: null,
							}
						: undefined
				}
			/>
		);
	};

	// With a checkpoint running the page is about its sprints; what led here
	// folds behind one button. Without one, the stages behind stay in view.
	const historyVisible = !running || showHistory;
	const nextStep = steps[current.order + 1];
	const release = steps.at(-1);

	return (
		<div className={styles.layout}>
			<div>
				{historyVisible &&
					steps.slice(0, current.order).flatMap((step, index) => [
						<PathNode key={step.id} marker="done">
							{stageCard(index)}
						</PathNode>,
						...closedNodes(step.id),
					])}

				{running && detail ? (
					<>
						{historyVisible && (
							<>
								<PathNode marker="done">{stageCard(current.order)}</PathNode>
								{closedNodes(current.id)}
							</>
						)}
						<PathNode
							marker="none"
							rail={historyVisible ? "solid" : "dashed"}
							space={12}
						>
							{here(historyToggle)}
						</PathNode>
						<RunningCheckpoint
							checkpoint={detail}
							project={project}
							previous={previous}
							canManage={can("project.checkpoints.manage")}
						/>
					</>
				) : (
					<>
						<PathNode marker="none" space={12}>
							{here()}
						</PathNode>
						<PathNode marker="current" offset={26}>
							{stageCard(current.order)}
						</PathNode>
						{closedNodes(current.id)}
					</>
				)}

				{nextStep && nextStep !== release && (
					<PathNode marker="todo" rail="dashed">
						{stageCard(nextStep.order)}
					</PathNode>
				)}
				{release && release.order > current.order && (
					<PathNode marker="todo" rail="none" offset={0} space={0}>
						<div className={styles.finish}>{stepName(release.order)}</div>
					</PathNode>
				)}
			</div>

			<aside className={styles.aside}>
				<WorkflowTasksPanel
					tasks={current.tasks.map((task) => ({
						id: task.id,
						label: task.name || task.description || "",
						description: task.name ? task.description : null,
						required: task.required,
						done: task.done,
					}))}
					showHint={false}
				/>
			</aside>

			<Modal
				centered
				title={t(
					"workflow.equity-transfer.title",
					"Equity Transfer Confirmation",
				)}
				open={equityOpen}
				onOk={async () => {
					await move.mutateAsync("next");
					setEquityOpen(false);
				}}
				onCancel={() => setEquityOpen(false)}
				confirmLoading={move.isPending}
			>
				<Flex vertical gap={8}>
					<Text>
						{t(
							"workflow.equity-transfer.description",
							"By proceeding to the next step, the following equity promises will be transferred to actual allocations:",
						)}
					</Text>
					{current.equityPromises?.map((promise) => (
						<Flex key={promise.id} gap={8}>
							<Text>
								<Text strong>{promise.allocation.owner.name}:</Text> +
								{promise.percentage}%
							</Text>
							<Text type="secondary">
								{t(
									"workflow.equity-transfer.total",
									"Total after transfer: {total}%",
									{
										total: (
											promise.allocation.percentage + promise.percentage
										).toString(),
									},
								)}
							</Text>
						</Flex>
					))}
				</Flex>
			</Modal>
		</div>
	);
}
