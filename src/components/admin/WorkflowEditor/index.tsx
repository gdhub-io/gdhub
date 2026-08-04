import {
	DeleteOutlined,
	EditOutlined,
	MenuOutlined,
	PlusOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Breadcrumb,
	Button,
	Card,
	Checkbox,
	Col,
	Flex,
	Form,
	message,
	Popconfirm,
	Row,
	Select,
	Space,
	Tag,
	Typography,
	theme,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONDITION_SOURCE_META } from "@/schemas/workflowTaskCondition";
import { normalizeWorkflowSteps } from "@/types/workflow";
import StepEditModal from "./StepEditModal";
import styles from "./style.module.scss";
import TaskEditModal from "./TaskEditModal";
import WorkflowSettingsModal from "./WorkflowSettingsModal";

const { Title, Text } = Typography;

// Helper functions for validation
export const validateWorkflowName = (name: string): boolean => {
	return /^[a-z0-9-]+$/.test(name);
};

type WorkflowType = "template" | "project";

interface WorkflowEditorProps {
	id: string;
	type?: WorkflowType;
}

export const WorkflowEditor = ({
	id,
	type = "template",
}: WorkflowEditorProps) => {
	const { token } = theme.useToken();
	const queryClient = useQueryClient();
	const [form] = Form.useForm();
	const [isFormInitialized, setIsFormInitialized] = useState(false);
	const [workflowTitle, setWorkflowTitle] = useState("New Workflow");
	const [workflowDescription, setWorkflowDescription] = useState("");
	const [workflowName, setWorkflowName] = useState("");
	const [currentStepId, setCurrentStepId] = useState<string | null>(null);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [stepEditModal, setStepEditModal] = useState<{
		visible: boolean;
		step: any;
		stepIndex: number;
		isNew: boolean;
	}>({
		visible: false,
		step: null,
		stepIndex: -1,
		isNew: false,
	});
	const [settingsModalVisible, setSettingsModalVisible] = useState(false);
	const [taskEditModal, setTaskEditModal] = useState<{
		visible: boolean;
		task: any;
		stepIndex: number;
		taskIndex: number;
		isNew: boolean;
	}>({
		visible: false,
		task: null,
		stepIndex: -1,
		taskIndex: -1,
		isNew: false,
	});

	// Choose endpoints based on type
	const getEndpoint = () => {
		if (type === "project") {
			return `/api/admin/project-workflow/${id}`;
		}
		return `/api/admin/workflow/${id}`;
	};

	const queryKey =
		type === "project" ? ["project-workflow", id] : ["workflow", id];

	const { data: workflow, isLoading } = useQuery({
		queryKey,
		queryFn: () => axios.get(getEndpoint()),
	});

	useEffect(() => {
		if (!workflow) return;

		const workflowData = workflow.data;

		if (type === "project") {
			// Handle ProjectWorkflow data structure
			setWorkflowTitle(
				workflowData.title || workflowData.project?.name || "Project Workflow",
			);
			setWorkflowDescription(workflowData.description || "");
			setWorkflowName(workflowData.name || "");
			setCurrentStepId(workflowData.currentStepId || null);

			// Convert ProjectWorkflow steps to WorkflowStepTemplate format
			const normalizedSteps = (workflowData.steps || []).map((step: any) => ({
				id: step.id,
				name: step.name,
				title: step.name,
				description: step.description || "",
				order: step.order || 0,
				tasks: (step.tasks || []).map((task: any) => ({
					id: task.id,
					name: task.name || task.description || "",
					title: task.name || task.description || "",
					description: task.description || "",
					required: Boolean(task.required),
					order: task.order || 0,
					done: Boolean(task.done),
					condition: task.condition ?? null,
				})),
			}));

			form.setFieldsValue({
				steps: normalizedSteps,
			});
		} else {
			// Handle WorkflowSchema data structure
			setWorkflowTitle(
				workflowData.title || workflowData.name || "New Workflow",
			);
			setWorkflowDescription(workflowData.description || "");
			setWorkflowName(workflowData.name || "");

			// Normalize the steps from JSON format
			const normalizedSteps = normalizeWorkflowSteps(workflowData.steps || []);

			form.setFieldsValue({
				steps: normalizedSteps,
			});
		}

		setIsFormInitialized(true);
	}, [workflow]);

	const { mutateAsync: updateWorkflow, isPending: isSaving } = useMutation({
		mutationFn: (data: any) => axios.put(getEndpoint(), data),
	});

	const handleSave = async () => {
		try {
			const values = await form.validateFields();

			if (type === "project") {
				// For ProjectWorkflow, save both title and steps structure
				const stepsWithOrder = (values.steps || []).map(
					(step: any, index: number) => ({
						...step,
						order: index,
						tasks: (step.tasks || []).map((task: any, taskIndex: number) => ({
							...task,
							order: taskIndex,
						})),
					}),
				);

				await updateWorkflow({
					title: workflowTitle,
					steps: stepsWithOrder,
					currentStepId: currentStepId,
				});

				message.success(
					type === "project" ? "Project workflow saved!" : "Workflow saved!",
				);

				queryClient.invalidateQueries({ queryKey });
				if (type === "project") {
					queryClient.invalidateQueries({
						queryKey: ["admin", "project-workflows"],
					});
				} else {
					queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
				}

				setHasUnsavedChanges(false);
			} else {
				// For WorkflowSchema, save the full structure with tasks
				const stepsWithOrder = (values.steps || []).map(
					(step: any, index: number) => ({
						...step,
						order: index,
						tasks: (step.tasks || []).map((task: any, taskIndex: number) => ({
							...task,
							order: taskIndex,
						})),
					}),
				);

				await updateWorkflow({
					name: workflowName,
					title: workflowTitle,
					description: workflowDescription,
					steps: stepsWithOrder,
				});
			}
		} catch (error) {
			console.error("Validation failed:", error);
		}
	};

	const handleSettingsSave = (settings: {
		title: string;
		description: string;
		name: string;
	}) => {
		setWorkflowTitle(settings.title);
		setWorkflowDescription(settings.description);
		setWorkflowName(settings.name);
		setHasUnsavedChanges(true);
	};

	const addStep = () => {
		setStepEditModal({
			visible: true,
			step: null,
			stepIndex: -1,
			isNew: true,
		});
	};

	const editStep = (stepIndex: number) => {
		const steps = form.getFieldValue("steps") || [];
		setStepEditModal({
			visible: true,
			step: steps[stepIndex],
			stepIndex,
			isNew: false,
		});
	};

	const handleStepSave = (updatedStep: any) => {
		const steps = form.getFieldValue("steps") || [];

		if (stepEditModal.isNew) {
			const newStep = {
				...updatedStep,
				id: Date.now().toString(),
				tasks: [], // All workflows can have tasks
			};
			steps.push(newStep);
		} else {
			steps[stepEditModal.stepIndex] = {
				...steps[stepEditModal.stepIndex],
				...updatedStep,
			};
		}

		form.setFieldValue("steps", [...steps]);
		setHasUnsavedChanges(true);
		setStepEditModal({
			visible: false,
			step: null,
			stepIndex: -1,
			isNew: false,
		});
	};

	const handleStepModalClose = () => {
		setStepEditModal({
			visible: false,
			step: null,
			stepIndex: -1,
			isNew: false,
		});
		// Ensure body scroll is restored
		setTimeout(() => {
			document.body.style.overflow = "";
		}, 100);
	};

	const removeStep = (stepIndex: number) => {
		const steps = form.getFieldValue("steps") || [];
		steps.splice(stepIndex, 1);
		form.setFieldValue("steps", [...steps]);
		setHasUnsavedChanges(true);
	};

	const onDragEnd = (result: any) => {
		if (!result.destination) return;

		const { source, destination } = result;
		const steps = form.getFieldValue("steps") || [];
		const [removed] = steps.splice(source.index, 1);
		steps.splice(destination.index, 0, removed);
		form.setFieldValue("steps", [...steps]);
		setHasUnsavedChanges(true);
	};

	const handleTitleChange = (value: string) => {
		setWorkflowTitle(value);
		setHasUnsavedChanges(true);
	};

	const handleCurrentStepChange = (stepId: string) => {
		setCurrentStepId(stepId);
		setHasUnsavedChanges(true);
	};

	const handleTaskStatusChange = (
		stepIndex: number,
		taskIndex: number,
		done: boolean,
	) => {
		const steps = form.getFieldValue("steps") || [];
		if (
			steps[stepIndex] &&
			steps[stepIndex].tasks &&
			steps[stepIndex].tasks[taskIndex]
		) {
			steps[stepIndex].tasks[taskIndex].done = done;
			form.setFieldValue("steps", [...steps]);
			setHasUnsavedChanges(true);
		}
	};

	const addTask = (stepIndex: number) => {
		setTaskEditModal({
			visible: true,
			task: null,
			stepIndex,
			taskIndex: -1,
			isNew: true,
		});
	};

	const editTask = (stepIndex: number, taskIndex: number) => {
		const steps = form.getFieldValue("steps") || [];
		const task = steps[stepIndex]?.tasks?.[taskIndex];
		if (task) {
			setTaskEditModal({
				visible: true,
				task,
				stepIndex,
				taskIndex,
				isNew: false,
			});
		}
	};

	const handleTaskSave = (updatedTask: any) => {
		const steps = form.getFieldValue("steps") || [];

		if (taskEditModal.isNew) {
			// Add new task
			if (!steps[taskEditModal.stepIndex].tasks) {
				steps[taskEditModal.stepIndex].tasks = [];
			}
			const newTask = {
				...updatedTask,
				id: Date.now().toString(),
				done: false,
			};
			steps[taskEditModal.stepIndex].tasks.push(newTask);
		} else {
			// Update existing task
			steps[taskEditModal.stepIndex].tasks[taskEditModal.taskIndex] = {
				...steps[taskEditModal.stepIndex].tasks[taskEditModal.taskIndex],
				...updatedTask,
			};
		}

		form.setFieldValue("steps", [...steps]);
		setHasUnsavedChanges(true);
		setTaskEditModal({
			visible: false,
			task: null,
			stepIndex: -1,
			taskIndex: -1,
			isNew: false,
		});
	};

	const removeTask = (stepIndex: number, taskIndex: number) => {
		const steps = form.getFieldValue("steps") || [];
		if (steps[stepIndex]?.tasks) {
			steps[stepIndex].tasks.splice(taskIndex, 1);
			form.setFieldValue("steps", [...steps]);
			setHasUnsavedChanges(true);
		}
	};

	const handleTaskModalClose = () => {
		setTaskEditModal({
			visible: false,
			task: null,
			stepIndex: -1,
			taskIndex: -1,
			isNew: false,
		});
		// Ensure body scroll is restored
		setTimeout(() => {
			document.body.style.overflow = "";
		}, 100);
	};

	// Ensure body scroll is restored when component unmounts
	useEffect(() => {
		return () => {
			document.body.style.overflow = "";
		};
	}, []);

	if (isLoading) {
		return <div>Loading...</div>;
	}

	const workflowData = workflow?.data;
	const isProjectWorkflow = type === "project";

	return (
		<div className={styles.container}>
			<Breadcrumb
				items={[
					{
						title: (
							<Link
								href="/admin/workflows"
								style={{ color: token.colorPrimary }}
							>
								Workflows
							</Link>
						),
					},
					{
						title: isProjectWorkflow ? "Project Workflows" : "Templates",
					},
					{
						title: <span>{workflowTitle}</span>,
					},
				]}
				style={{ marginBottom: 24 }}
			/>

			{isProjectWorkflow && workflowData?.project && (
				<Card style={{ marginBottom: 24 }}>
					<Row gutter={[16, 16]}>
						<Col span={12}>
							<Text strong>Project:</Text> {workflowData.project.name}
						</Col>
						<Col span={12}>
							<Text strong>Author:</Text> {workflowData.project.author.name}
						</Col>
						<Col span={12}>
							<Text strong>Created:</Text>{" "}
							{dayjs(workflowData.createdAt).format("DD/MM/YYYY")}
						</Col>
						<Col span={12}>
							<Text strong>Steps:</Text> {workflowData.steps?.length || 0}
						</Col>
					</Row>
				</Card>
			)}

			<div>
				<Flex justify="space-between" align="center">
					<div>
						<Title
							level={1}
							className={styles.workflowTitle}
							editable={{
								triggerType: ["text"],
								maxLength: 150,
								onChange: handleTitleChange,
							}}
						>
							{workflowTitle}
						</Title>
						<p className={styles.workflowSubtitle}>
							Last updated on{" "}
							{dayjs(workflowData?.updatedAt).format("DD/MM/YYYY")}
						</p>
					</div>
					<div className={styles.headerActions}>
						{isProjectWorkflow && (
							<Space>
								<Text strong>Current step:</Text>
								<Select
									style={{ width: 200 }}
									placeholder="Select the current step"
									value={currentStepId}
									onChange={handleCurrentStepChange}
									allowClear
								>
									{(workflowData?.steps || []).map((step: any) => (
										<Select.Option key={step.id} value={step.id}>
											{step.name}
										</Select.Option>
									))}
								</Select>
							</Space>
						)}
						{!isProjectWorkflow && (
							<Button
								icon={<SettingOutlined />}
								onClick={() => setSettingsModalVisible(true)}
							>
								Settings
							</Button>
						)}
						<Button
							type="primary"
							onClick={handleSave}
							disabled={!hasUnsavedChanges}
							loading={isSaving}
						>
							Save
						</Button>
					</div>
				</Flex>
			</div>

			<div style={{ marginBottom: 24 }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 16,
					}}
				>
					<Title level={2} style={{ margin: 0 }}>
						{isProjectWorkflow ? "Project steps" : "Steps"}
					</Title>
					<Button type="primary" icon={<PlusOutlined />} onClick={addStep}>
						Add step
					</Button>
				</div>

				<Form form={form} layout="vertical">
					<DragDropContext onDragEnd={onDragEnd}>
						<Droppable droppableId="steps">
							{(provided) => (
								<div {...provided.droppableProps} ref={provided.innerRef}>
									<Form.List name="steps">
										{(fields) => (
											<>
												{fields.map((field, stepIndex) => (
													<Draggable
														key={field.key}
														draggableId={`step-${field.key}`}
														index={stepIndex}
													>
														{(provided) => (
															<div
																ref={provided.innerRef}
																{...provided.draggableProps}
																className={styles.stepCard}
															>
																<Card
																	size="small"
																	title={
																		<div className={styles.stepHeader}>
																			<div
																				{...provided.dragHandleProps}
																				className={styles.dragHandle}
																			>
																				<MenuOutlined />
																			</div>
																			<span>
																				{form.getFieldValue([
																					"steps",
																					stepIndex,
																					"title",
																				]) ||
																					form.getFieldValue([
																						"steps",
																						stepIndex,
																						"name",
																					]) ||
																					`Step ${stepIndex + 1}`}
																			</span>
																			<div className={styles.stepActions}>
																				<Button
																					type="text"
																					icon={<EditOutlined />}
																					onClick={() => editStep(stepIndex)}
																					size="small"
																				>
																					Edit
																				</Button>
																				<Popconfirm
																					title="Delete step?"
																					onConfirm={() =>
																						removeStep(stepIndex)
																					}
																				>
																					<Button
																						type="text"
																						danger
																						icon={<DeleteOutlined />}
																						size="small"
																					/>
																				</Popconfirm>
																			</div>
																		</div>
																	}
																>
																	<div className={styles.stepDescription}>
																		{form.getFieldValue([
																			"steps",
																			stepIndex,
																			"description",
																		]) || "No description"}
																	</div>
																	<div style={{ marginTop: 12 }}>
																		<div
																			style={{
																				display: "flex",
																				justifyContent: "space-between",
																				alignItems: "center",
																				marginBottom: 8,
																			}}
																		>
																			<Text strong>Tasks:</Text>
																			<Button
																				type="link"
																				size="small"
																				icon={<PlusOutlined />}
																				onClick={() => addTask(stepIndex)}
																			>
																				Add
																			</Button>
																		</div>
																		<div style={{ marginTop: 8 }}>
																			{(
																				form.getFieldValue([
																					"steps",
																					stepIndex,
																					"tasks",
																				]) || []
																			).map((task: any, taskIndex: number) => (
																				<div
																					key={task.id || taskIndex}
																					style={{
																						display: "flex",
																						alignItems: "center",
																						justifyContent: "space-between",
																						marginBottom: 4,
																						padding: "4px 8px",
																						backgroundColor:
																							"var(--gd-color-surface-sunken)",
																						borderRadius: "4px",
																					}}
																				>
																					<div
																						style={{
																							display: "flex",
																							alignItems: "center",
																							flex: 1,
																						}}
																					>
																						{isProjectWorkflow ? (
																							<Checkbox
																								checked={Boolean(task.done)}
																								onChange={(e) =>
																									handleTaskStatusChange(
																										stepIndex,
																										taskIndex,
																										e.target.checked,
																									)
																								}
																								style={{ marginRight: 8 }}
																							>
																								<span
																									style={{
																										textDecoration: task.done
																											? "line-through"
																											: "none",
																										color: task.done
																											? "var(--gd-color-text-tertiary)"
																											: "inherit",
																									}}
																								>
																									{task.title ||
																										task.name ||
																										task.description ||
																										`Task ${taskIndex + 1}`}
																								</span>
																							</Checkbox>
																						) : (
																							<span style={{ marginLeft: 8 }}>
																								{task.title ||
																									task.name ||
																									task.description ||
																									`Task ${taskIndex + 1}`}
																							</span>
																						)}
																						{task.required && (
																							<Tag
																								color="red"
																								style={{ marginLeft: 8 }}
																							>
																								Required
																							</Tag>
																						)}
																						{task.condition?.source && (
																							<Tag color="blue">
																								{CONDITION_SOURCE_META.find(
																									(m) =>
																										m.source ===
																										task.condition.source,
																								)?.label || "Condition"}
																							</Tag>
																						)}
																					</div>
																					<div
																						style={{ display: "flex", gap: 4 }}
																					>
																						<Button
																							type="text"
																							size="small"
																							icon={<EditOutlined />}
																							onClick={() =>
																								editTask(stepIndex, taskIndex)
																							}
																						/>
																						<Popconfirm
																							title="Delete task?"
																							onConfirm={() =>
																								removeTask(stepIndex, taskIndex)
																							}
																						>
																							<Button
																								type="text"
																								size="small"
																								danger
																								icon={<DeleteOutlined />}
																							/>
																						</Popconfirm>
																					</div>
																				</div>
																			))}
																			{(!form.getFieldValue([
																				"steps",
																				stepIndex,
																				"tasks",
																			]) ||
																				form.getFieldValue([
																					"steps",
																					stepIndex,
																					"tasks",
																				]).length === 0) && (
																				<Text
																					type="secondary"
																					style={{ fontSize: "12px" }}
																				>
																					No tasks
																				</Text>
																			)}
																		</div>
																	</div>
																</Card>
															</div>
														)}
													</Draggable>
												))}
												{provided.placeholder}
											</>
										)}
									</Form.List>
								</div>
							)}
						</Droppable>
					</DragDropContext>
				</Form>
			</div>

			<StepEditModal
				visible={stepEditModal.visible}
				onClose={handleStepModalClose}
				onSave={handleStepSave}
				step={stepEditModal.step}
				isNew={stepEditModal.isNew}
			/>

			{!isProjectWorkflow && (
				<WorkflowSettingsModal
					visible={settingsModalVisible}
					onClose={() => setSettingsModalVisible(false)}
					onSave={handleSettingsSave}
					settings={{
						title: workflowTitle,
						description: workflowDescription,
						name: workflowName,
					}}
				/>
			)}

			<TaskEditModal
				visible={taskEditModal.visible}
				onClose={handleTaskModalClose}
				onSave={handleTaskSave}
				task={taskEditModal.task}
				isNew={taskEditModal.isNew}
			/>
		</div>
	);
};
