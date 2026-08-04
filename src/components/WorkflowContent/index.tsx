import type {
	ProjectWorkflow as PrismaProjectWorkflow,
	ProjectWorkflowStep,
	ProjectWorkflowTask,
} from "@gdhub-io/gdhub-prisma";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Col,
	Drawer,
	Grid,
	Modal,
	Popover,
	Row,
	Space,
	Steps,
	Typography,
} from "antd";
import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { ProjectContext } from "@/contexts/ProjectContext";
import { gtmEventTrigger } from "@/helpers/gtm";
import { capitalize } from "@/helpers/text";
import { RoadmapChart } from "../RoadmapChart";
import styles from "./style.module.scss";
import WorkflowStepContent from "./WorkflowStepContent";
import WorkflowTasksPanel, {
	type WorkflowTaskItem,
} from "./WorkflowTasksPanel";

const { Text } = Typography;

export type ProjectWorkflow = PrismaProjectWorkflow & {
	steps: ProjectWorkflowStep[];
};

type EquityPromise = {
	id: string;
	percentage: number;
	owner: {
		id: string;
		name: string;
	};
	allocation: {
		owner: {
			name: string;
		};
		percentage: number;
	};
};

export type ProjectWorkflowWithSteps = ProjectWorkflow & {
	steps: (ProjectWorkflowStep & {
		equityPromises?: EquityPromise[];
	})[];
	currentStep: ProjectWorkflowStep & {
		tasks: ProjectWorkflowTask[];
		equityPromises?: (EquityPromise & {
			allocation: { owner: { name: string } };
		})[];
	};
};

const WorkflowContent = ({
	projectId,
	locale = "en",
}: {
	projectId: string;
	locale?: string;
}) => {
	const screens = Grid.useBreakpoint();
	const projectContext = useContext(ProjectContext)?.contextProject;
	const [conditionStatus, setConditionStatus] = useState<any>({
		completed: false,
	});
	const [workflow, setWorkflow] = useState<ProjectWorkflowWithSteps>();
	const [drawerVisible, setDrawerVisible] = useState(false);
	const [popoverVisible, setPopoverVisible] = useState(false);
	const [equityTransferModalVisible, setEquityTransferModalVisible] =
		useState(false);
	const { t } = useTranslate();
	const { can } = useAccess();
	// Editing the workflow is a permission, and an archived project has it
	// revoked server-side — no separate archive check needed here.
	const isAuthor = can("project.workflow.edit");
	const isProjectArchived =
		!projectContext || !!projectContext.isProjectArchived;

	const currentStepOrder = useMemo(
		() => workflow?.currentStep?.order || 0,
		[workflow?.currentStep],
	);
	const { data: workflowResponse, refetch: refetchWorkflowData } = useQuery({
		queryKey: ["project-workflow", projectId],
		queryFn: () =>
			axios.get<ProjectWorkflowWithSteps>("/api/user/project/workflow", {
				params: { projectId },
			}),
		enabled: !!projectId,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (workflowResponse?.data) {
			setWorkflow(workflowResponse.data);
		}
	}, [workflowResponse]);

	const { mutateAsync: moveProjectToStep, isPending: isMoving } = useMutation({
		mutationFn: (data: {
			projectId: string;
			direction: "next" | "previous";
			targetStepId?: string;
		}) => axios.put<void>(`/api/project/move`, data),
		onSuccess: () => {
			refetchWorkflowData();
		},
	});

	const isIntroductionStep = useMemo(
		() => currentStepOrder === 0,
		[workflow?.currentStep],
	);
	const isCompletionStep = useMemo(
		() => workflow && currentStepOrder === workflow?.steps.length - 1,
		[currentStepOrder, workflow?.steps],
	);
	const isPreCompletionStep = useMemo(
		() => workflow && currentStepOrder === workflow?.steps.length - 2,
		[currentStepOrder, workflow?.steps],
	);
	const isRoadmapStep = useMemo(
		() => !isIntroductionStep && !isCompletionStep,
		[isIntroductionStep, isCompletionStep],
	);

	const handlePreviousStep = () => {
		if (isProjectArchived) return;

		moveProjectToStep({ projectId, direction: "previous" });
		gtmEventTrigger("workflow_move", {
			projectId,
			direction: "previous",
			currentStep: workflow?.currentStep.name,
			previousStep: workflow?.steps[currentStepOrder - 1].name,
		});
	};

	const handleNextStep = () => {
		if (isProjectArchived) return;

		if (
			workflow?.currentStep.equityPromises &&
			workflow.currentStep.equityPromises.length > 0
		) {
			setEquityTransferModalVisible(true);
		} else {
			moveProjectToStep({ projectId, direction: "next" });
			gtmEventTrigger("workflow_move", {
				projectId,
				direction: "next",
				currentStep: workflow?.currentStep.name,
				nextStep: workflow?.steps[currentStepOrder + 1].name,
			});
		}
	};

	const handleEquityTransferConfirm = async () => {
		if (isProjectArchived) return;

		await moveProjectToStep({ projectId, direction: "next" });
		setEquityTransferModalVisible(false);
	};

	useEffect(() => {
		const stepTasks = workflow?.currentStep?.tasks ?? [];
		const requiredTasks = stepTasks.filter((t) => t.required);

		// Advancing is gated on required tasks only; a step with no required
		// tasks is always completable.
		setConditionStatus({ completed: requiredTasks.every((t) => t.done) });
	}, [workflow?.currentStep?.tasks]);

	const taskItems: WorkflowTaskItem[] = (
		workflow?.currentStep?.tasks ?? []
	).map((task) => ({
		id: task.id,
		label: task.name || task.description || "",
		description: task.name ? task.description : null,
		required: task.required,
		done: task.done,
	}));

	const stepsStepsList = (
		<div className={styles.stepsWrapper}>
			<Steps
				direction="vertical"
				current={currentStepOrder}
				items={workflow?.steps.map((s, idx: number) => ({
					key: s.id,
					title: capitalize(
						t(`workflow.${workflow.title}.step${idx + 1}.name`, s.name),
					),
					disabled: true,
				}))}
			/>
		</div>
	);

	if (!workflow) return null;

	return (
		<div className={styles.container}>
			<Space orientation="vertical" style={{ width: "100%" }}>
				{!isIntroductionStep && !isCompletionStep && (
					<RoadmapChart workflow={workflow} editable={isAuthor} />
				)}

				<Row gutter={[32, 32]}>
					<Col xs={24} lg={16}>
						<Space
							orientation="vertical"
							size={[32, 16]}
							style={{ width: "100%" }}
						>
							<div className={styles.stepContent}>
								<WorkflowStepContent
									step={workflow.currentStep}
									locale={locale}
								/>
							</div>

							{isIntroductionStep && isAuthor && (
								<Button
									type="primary"
									onClick={handleNextStep}
									disabled={isMoving}
								>
									<Space size={8}>
										{t("workflow.start-step", "Go to the next step")}
										<IconArrowRight style={{ display: "block" }} />
									</Space>
								</Button>
							)}

							{isRoadmapStep && isAuthor && (
								<Space size={8}>
									{currentStepOrder > 1 && (
										<Button
											onClick={handlePreviousStep}
											disabled={isMoving}
											type="text"
										>
											{t("workflow.previous-step", "Previous")}
										</Button>
									)}
									<>
										{conditionStatus.completed == false ? (
											<Popover content={t("Tasks are not completed")}>
												<Button disabled={conditionStatus.completed == false}>
													{isPreCompletionStep
														? t("workflow.next-step", "Go to completion step")
														: t("workflow.finish-step", "Next step")}
												</Button>
											</Popover>
										) : (
											<Button onClick={handleNextStep} disabled={isMoving}>
												{isPreCompletionStep
													? t("workflow.next-step", "Go to completion step")
													: t("workflow.finish-step", "Next step")}
											</Button>
										)}
									</>
								</Space>
							)}

							{isCompletionStep && isAuthor && (
								<Button
									onClick={handlePreviousStep}
									disabled={isMoving}
									type="text"
								>
									<Space size={8}>
										<IconArrowLeft style={{ display: "block" }} />
										{t("workflow.previous-step", "Return to the previous step")}
									</Space>
								</Button>
							)}

							{!screens.lg && isRoadmapStep && taskItems.length > 0 && (
								<div className={styles.tasksSidebar}>
									<WorkflowTasksPanel tasks={taskItems} />
								</div>
							)}
						</Space>
					</Col>
					{screens.lg && isRoadmapStep && (
						<Col xs={24} lg={8}>
							<div className={styles.tasksSidebar}>
								{taskItems.length > 0 ? (
									<WorkflowTasksPanel tasks={taskItems} />
								) : (
									<Text type="secondary">
										{t("workflow.no-tasks", "No tasks for this step")}
									</Text>
								)}
							</div>
						</Col>
					)}
				</Row>
			</Space>

			<Modal
				centered
				title={t(
					"workflow.equity-transfer.title",
					"Equity Transfer Confirmation",
				)}
				open={equityTransferModalVisible}
				onOk={handleEquityTransferConfirm}
				onCancel={() => setEquityTransferModalVisible(false)}
				confirmLoading={isMoving}
			>
				<Space orientation="vertical" style={{ width: "100%" }}>
					<Text>
						{t(
							"workflow.equity-transfer.description",
							"By proceeding to the next step, the following equity promises will be transferred to actual allocations:",
						)}
					</Text>
					{workflow?.currentStep?.equityPromises?.map((promise) => (
						<Space key={promise.id} style={{ width: "100%" }}>
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
						</Space>
					))}
				</Space>
			</Modal>

			<Drawer
				title={t("workflow.all-steps", "All steps")}
				placement="right"
				onClose={() => setDrawerVisible(false)}
				open={drawerVisible}
				size={screens.sm ? 400 : "80%"}
			>
				{stepsStepsList}
			</Drawer>
		</div>
	);
};

export default WorkflowContent;
