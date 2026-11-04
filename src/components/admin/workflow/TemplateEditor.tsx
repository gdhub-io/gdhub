"use client";

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
	IconBolt,
	IconCopy,
	IconGripVertical,
	IconHandStop,
	IconInfoCircle,
	IconPencil,
	IconPlus,
	IconRotateClockwise,
	IconSettings,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Alert,
	App,
	Breadcrumb,
	Button,
	Card,
	Flex,
	Form,
	Input,
	Skeleton,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EditorJsField } from "@/components/admin/EditorJsField";
import StepEditModal from "@/components/admin/WorkflowEditor/StepEditModal";
import TaskEditModal from "@/components/admin/WorkflowEditor/TaskEditModal";
import WorkflowSettingsModal from "@/components/admin/WorkflowEditor/WorkflowSettingsModal";
import {
	nextKey,
	type StepDraft,
	type TaskDraft,
	toDrafts,
	toPayload,
} from "@/lib/workflow/template-drafts";
import { describeCondition } from "@/services/workflow/describeCondition";
import { GOAL_TOOLTIP } from "./InheritedField";
import { useProjectWorkflows } from "./queries";
import { type ResetTarget, ResetWorkflowModal } from "./ResetWorkflowModal";
import styles from "./TemplateEditor.module.scss";

const { Title, Text } = Typography;

const move = <T,>(list: T[], from: number, to: number): T[] => {
	const next = [...list];
	const [item] = next.splice(from, 1);
	next.splice(to, 0, item);
	return next;
};

export function TemplateEditor({ id }: { id: string }) {
	const { message, modal } = App.useApp();
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ["admin", "workflow", id],
		queryFn: () => axios.get(`/api/admin/workflow/${id}`),
	});

	const [steps, setSteps] = useState<StepDraft[]>([]);
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const [meta, setMeta] = useState({
		name: "",
		title: "",
		description: "",
		goal: "",
	});
	const [loaded, setLoaded] = useState(false);
	const [dirty, setDirty] = useState(false);
	// Which step is open, by position: a reload rebuilds the keys, not the order.
	const openAt = useRef(0);

	const [settingsOpen, setSettingsOpen] = useState(false);
	const [resetTargets, setResetTargets] = useState<ResetTarget[]>([]);

	// Which projects a change here could be pushed onto.
	const { data: projectWorkflows } = useProjectWorkflows();
	const usingProjects = (projectWorkflows ?? []).filter(
		(row) => row.template?.id === id,
	);

	const [stepModal, setStepModal] = useState<{
		open: boolean;
		step: StepDraft | null;
	}>({ open: false, step: null });
	const [taskModal, setTaskModal] = useState<{
		open: boolean;
		task: TaskDraft | null;
	}>({ open: false, task: null });

	useEffect(() => {
		if (!data?.data) return;
		const template = data.data;
		const drafts = toDrafts(
			(template.steps ?? []) as PrismaJson.WorkflowStep[],
		);
		setSteps(drafts);
		// After a save the drafts are rebuilt; the step that was open stays open.
		setSelectedKey((drafts[openAt.current] ?? drafts[0])?.key ?? null);
		setMeta({
			name: template.name ?? "",
			title: template.title ?? "",
			description: template.description ?? "",
			goal: template.goal ?? "",
		});
		setLoaded(true);
		setDirty(false);
	}, [data]);

	const selected = steps.find((step) => step.key === selectedKey) ?? null;
	openAt.current = Math.max(
		steps.findIndex((step) => step.key === selectedKey),
		0,
	);

	const totals = useMemo(
		() => ({
			steps: steps.length,
			tasks: steps.reduce((sum, step) => sum + step.tasks.length, 0),
		}),
		[steps],
	);

	const { mutateAsync: save, isPending: isSaving } = useMutation({
		mutationFn: () =>
			axios.put(`/api/admin/workflow/${id}`, {
				name: meta.name || undefined,
				title: meta.title || undefined,
				description: meta.description || undefined,
				goal: meta.goal,
				steps: toPayload(steps),
			}),
		onSuccess: () => {
			message.success("Template saved");
			setDirty(false);
			queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
			queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
		},
	});

	const patchSteps = (next: StepDraft[]) => {
		setSteps(next);
		setDirty(true);
	};

	const patchSelected = (patch: Partial<StepDraft>) => {
		if (!selected) return;
		patchSteps(
			steps.map((step) =>
				step.key === selected.key ? { ...step, ...patch } : step,
			),
		);
	};

	/** Inline rename: an empty title would leave the step unlabelled, so it is
	 *  treated as a cancelled edit rather than a value. */
	const renameStep = (value: string) => {
		const name = value.trim();
		if (name && name !== selected?.name) patchSelected({ name });
	};

	const renameTemplate = (value: string) => {
		const title = value.trim();
		if (title && title !== meta.title) {
			setMeta((current) => ({ ...current, title }));
			setDirty(true);
		}
	};

	/**
	 * A copy lands next to its original, not at the end of the flow, and the
	 * editor follows it — you duplicated a step in order to work on the copy.
	 */
	const duplicateStep = (step: StepDraft) => {
		const copy: StepDraft = {
			...step,
			key: nextKey(),
			name: `${step.name} copy`,
			tasks: step.tasks.map((task) => ({ ...task, key: nextKey() })),
		};
		const at = steps.findIndex((item) => item.key === step.key);
		const next = [...steps];
		next.splice(at + 1, 0, copy);
		patchSteps(next);
		setSelectedKey(copy.key);
	};

	/** After a delete the pane cannot keep showing what is gone. */
	const deleteStep = (key: string) => {
		const next = steps.filter((step) => step.key !== key);
		patchSteps(next);
		setSelectedKey((current) =>
			current === key ? (next[0]?.key ?? null) : current,
		);
	};

	const handleSave = () => {
		// The column is rewritten wholesale, so an empty list would blank the
		// template every future project is created from. The server refuses it;
		// the button should not offer it either.
		if (!loaded) return;
		if (!steps.length) {
			message.error("A template needs at least one step");
			return;
		}
		if (steps.some((step) => !step.name.trim())) {
			message.error("Every step needs a name");
			return;
		}
		save();
	};

	if (isLoading) {
		return <Skeleton active paragraph={{ rows: 8 }} />;
	}

	return (
		<Flex vertical gap={16}>
			<Breadcrumb
				items={[
					{ title: <Link href="/admin/workflows">Workflows</Link> },
					{ title: <Link href="/admin/workflows">Templates</Link> },
					{ title: meta.title || meta.name },
				]}
			/>

			<Flex
				component="header"
				align="flex-start"
				justify="space-between"
				gap={24}
				wrap
			>
				<Flex vertical gap={6} className={styles.titles}>
					{/* The pencil renames the template and nothing else. Everything a
					    rename is not — slug, description — lives behind Settings. */}
					<Title
						level={1}
						className={styles.title}
						editable={{
							icon: <IconPencil size={16} />,
							tooltip: "Rename template",
							triggerType: ["icon", "text"],
							maxLength: 120,
							onChange: renameTemplate,
						}}
					>
						{meta.title || meta.name}
					</Title>
					<Flex align="center" gap={10} wrap>
						<Tag variant="filled" className={styles.slugChip}>
							{meta.name}
						</Tag>
						<Text type="secondary" className={styles.meta}>
							{totals.steps} steps · {totals.tasks} tasks
							{data?.data?.updatedAt
								? ` · updated ${dayjs(data.data.updatedAt).fromNow()}`
								: ""}
						</Text>
					</Flex>
				</Flex>

				<Flex align="center" gap={10}>
					{dirty && (
						<Flex align="center" gap={6} className={styles.unsaved}>
							<span className={styles.unsavedDot} />
							Unsaved changes
						</Flex>
					)}
					<Button
						icon={<IconSettings size={16} />}
						onClick={() => setSettingsOpen(true)}
					>
						Settings
					</Button>
					<Button type="primary" loading={isSaving} onClick={handleSave}>
						Save
					</Button>
				</Flex>
			</Flex>

			{/* The distinction the whole page rests on: a template is a starting
			    point, not a live plan. Editing it never reaches a running project. */}
			<Alert
				type="info"
				icon={<IconInfoCircle size={16} />}
				showIcon
				title="Steps and tasks apply to new projects only; projects already running keep their own copy. A stage's goal and text reach every project at once."
				action={
					<Button
						size="small"
						icon={<IconRotateClockwise size={14} />}
						disabled={!usingProjects.length}
						onClick={() =>
							setResetTargets(
								usingProjects.map((row) => ({
									id: row.id,
									projectName: row.project.name,
									templateId: id,
								})),
							)
						}
					>
						{usingProjects.length
							? `Reset ${usingProjects.length} project${
									usingProjects.length === 1 ? "" : "s"
								} to this template…`
							: "No projects use this template yet"}
					</Button>
				}
			/>

			<div className={styles.panes}>
				<Card className={styles.rail} styles={{ body: { padding: 0 } }}>
					<Flex
						align="center"
						justify="space-between"
						gap={12}
						className={styles.railHeader}
					>
						<Flex align="center" gap={8} className={styles.railTitle}>
							Steps <span className={styles.count}>{steps.length}</span>
						</Flex>
						<Text type="secondary" className={styles.hint}>
							Drag to reorder
						</Text>
					</Flex>

					<DragDropContext
						onDragEnd={(result) => {
							if (!result.destination) return;
							patchSteps(
								move(steps, result.source.index, result.destination.index),
							);
						}}
					>
						<Droppable droppableId="steps">
							{(dropProvided) => (
								<div
									className={styles.stepList}
									ref={dropProvided.innerRef}
									{...dropProvided.droppableProps}
								>
									{steps.map((step, index) => {
										const required = step.tasks.filter(
											(task) => task.required,
										).length;
										return (
											<Draggable
												key={step.key}
												draggableId={step.key}
												index={index}
											>
												{(dragProvided) => (
													<button
														type="button"
														ref={dragProvided.innerRef}
														{...dragProvided.draggableProps}
														className={`${styles.stepRow} ${
															step.key === selectedKey
																? styles.stepRowActive
																: ""
														}`}
														onClick={() => setSelectedKey(step.key)}
													>
														<span
															className={styles.grip}
															{...dragProvided.dragHandleProps}
														>
															<IconGripVertical size={16} />
														</span>
														<span className={styles.index}>{index + 1}</span>
														<span className={styles.stepTexts}>
															<span className={styles.stepName}>
																{step.name || "Untitled step"}
															</span>
															<span className={styles.stepSub}>
																{step.tasks.length} tasks
																{required ? ` · ${required} required` : ""}
															</span>
														</span>
													</button>
												)}
											</Draggable>
										);
									})}
									{dropProvided.placeholder}
								</div>
							)}
						</Droppable>
					</DragDropContext>

					<div className={styles.railFooter}>
						<Button
							block
							icon={<IconPlus size={14} />}
							onClick={() => setStepModal({ open: true, step: null })}
						>
							Add step
						</Button>
					</div>
				</Card>

				<Card className={styles.detail} styles={{ body: { padding: 0 } }}>
					{!selected ? (
						<div className={styles.emptyDetail}>
							Add a step to start describing the path.
						</div>
					) : (
						<>
							<Flex
								align="flex-start"
								justify="space-between"
								gap={16}
								wrap
								className={styles.detailHeader}
							>
								<Flex vertical gap={6} className={styles.titles}>
									<Flex align="center" gap={8}>
										<span className={styles.index}>
											{steps.indexOf(selected) + 1}
										</span>
										{/* The step has exactly two editable things, and the
										    description is already a field below — so the pencil
										    can only mean the name. */}
										<Title
											level={2}
											className={styles.stepTitle}
											editable={{
												icon: <IconPencil size={16} />,
												tooltip: "Rename step",
												triggerType: ["icon", "text"],
												maxLength: 120,
												onChange: renameStep,
											}}
										>
											{selected.name}
										</Title>
									</Flex>
									<Text type="secondary" className={styles.meta}>
										{selected.tasks.length} tasks ·{" "}
										{selected.tasks.filter((task) => task.required).length}{" "}
										required ·{" "}
										{selected.tasks.filter((task) => task.condition).length}{" "}
										auto-checked
									</Text>
								</Flex>
								<Flex align="center" gap={8}>
									<Button
										size="small"
										icon={<IconCopy size={16} />}
										onClick={() => duplicateStep(selected)}
									>
										Duplicate
									</Button>
									<Button
										size="small"
										danger
										icon={<IconTrash size={16} />}
										onClick={() =>
											modal.confirm({
												title: `Delete “${selected.name}”?`,
												content:
													"Projects already created from this template keep the step.",
												okText: "Delete",
												okButtonProps: { danger: true },
												onOk: () => deleteStep(selected.key),
											})
										}
									>
										Delete
									</Button>
								</Flex>
							</Flex>

							<Flex vertical gap={12} className={styles.detailBody}>
								{/* Frame 10.09 (`rr9n1`, `ouuf4`): the goal right above the text, so each is in sight while the other is edited (GDHUB-97). */}
								<Form layout="vertical">
									<Form.Item label="Goal" tooltip={GOAL_TOOLTIP}>
										<Input.TextArea
											value={selected.goal ?? ""}
											autoSize={{ minRows: 2 }}
											placeholder="The result this stage must leave the project at, in a sentence or two."
											onChange={(event) =>
												patchSelected({ goal: event.target.value })
											}
										/>
									</Form.Item>
									<Form.Item label="Stage text" style={{ marginBottom: 0 }}>
										<EditorJsField
											key={selected.key}
											value={selected.content}
											placeholder="Write the stage text…"
											onChange={(content) => patchSelected({ content })}
										/>
									</Form.Item>
								</Form>

								<Flex
									align="center"
									justify="space-between"
									gap={12}
									className={styles.tasksHeader}
								>
									<Flex align="center" gap={8} className={styles.railTitle}>
										Tasks{" "}
										<span className={styles.count}>
											{selected.tasks.length}
										</span>
									</Flex>
									<Button
										size="small"
										icon={<IconPlus size={14} />}
										onClick={() => setTaskModal({ open: true, task: null })}
									>
										Add task
									</Button>
								</Flex>

								<DragDropContext
									onDragEnd={(result) => {
										if (!result.destination) return;
										patchSelected({
											tasks: move(
												selected.tasks,
												result.source.index,
												result.destination.index,
											),
										});
									}}
								>
									<Droppable droppableId="tasks">
										{(dropProvided) => (
											<div
												className={styles.taskList}
												ref={dropProvided.innerRef}
												{...dropProvided.droppableProps}
											>
												{selected.tasks.map((task, index) => (
													<Draggable
														key={task.key}
														draggableId={task.key}
														index={index}
													>
														{(dragProvided) => (
															<div
																ref={dragProvided.innerRef}
																{...dragProvided.draggableProps}
																className={styles.taskRow}
															>
																<span
																	className={styles.grip}
																	{...dragProvided.dragHandleProps}
																>
																	<IconGripVertical size={16} />
																</span>
																<Flex
																	vertical
																	gap={4}
																	className={styles.taskTexts}
																>
																	<Flex align="center" gap={8} wrap>
																		<span className={styles.taskName}>
																			{task.name}
																		</span>
																		{task.required && (
																			<Tag color="orange" variant="outlined">
																				Required
																			</Tag>
																		)}
																	</Flex>
																	{task.description && (
																		<span className={styles.taskDesc}>
																			{task.description}
																		</span>
																	)}
																</Flex>
																<Flex align="center" gap={4} flex="0 0 auto">
																	{/* Auto-checked or not is the thing an admin
																	    scans for: the platform proves it, or a
																	    human has to. */}
																	<Tag
																		variant="outlined"
																		className={styles.conditionTag}
																		icon={
																			task.condition ? (
																				<IconBolt size={12} />
																			) : (
																				<IconHandStop size={12} />
																			)
																		}
																	>
																		{task.condition
																			? describeCondition(task.condition)
																			: "Manual"}
																	</Tag>
																	<Button
																		type="text"
																		size="small"
																		icon={<IconPencil size={16} />}
																		onClick={() =>
																			setTaskModal({ open: true, task })
																		}
																	/>
																	<Button
																		type="text"
																		size="small"
																		danger
																		icon={<IconTrash size={16} />}
																		onClick={() =>
																			patchSelected({
																				tasks: selected.tasks.filter(
																					(item) => item.key !== task.key,
																				),
																			})
																		}
																	/>
																</Flex>
															</div>
														)}
													</Draggable>
												))}
												{dropProvided.placeholder}
											</div>
										)}
									</Droppable>
								</DragDropContext>

								<Button
									block
									type="dashed"
									icon={<IconPlus size={14} />}
									onClick={() => setTaskModal({ open: true, task: null })}
								>
									Add task to this step
								</Button>
							</Flex>
						</>
					)}
				</Card>
			</div>

			<WorkflowSettingsModal
				visible={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				settings={meta}
				onSave={(next: typeof meta) => {
					setMeta(next);
					setDirty(true);
					setSettingsOpen(false);
				}}
			/>

			<StepEditModal
				visible={stepModal.open}
				isNew={!stepModal.step}
				step={stepModal.step}
				onClose={() => setStepModal({ open: false, step: null })}
				onSave={(value: {
					name?: string;
					title?: string;
					description?: string;
				}) => {
					const name = value.name?.trim() || value.title?.trim() || "";
					if (stepModal.step) {
						patchSteps(
							steps.map((step) =>
								step.key === stepModal.step?.key
									? { ...step, name, description: value.description }
									: step,
							),
						);
					} else {
						const created: StepDraft = {
							key: nextKey(),
							name,
							description: value.description,
							tasks: [],
						};
						patchSteps([...steps, created]);
						setSelectedKey(created.key);
					}
					setStepModal({ open: false, step: null });
				}}
			/>

			<ResetWorkflowModal
				targets={resetTargets}
				onClose={() => setResetTargets([])}
			/>

			<TaskEditModal
				visible={taskModal.open}
				isNew={!taskModal.task}
				task={taskModal.task}
				onClose={() => setTaskModal({ open: false, task: null })}
				onSave={(value: Omit<TaskDraft, "key">) => {
					if (!selected) return;
					if (taskModal.task) {
						patchSelected({
							tasks: selected.tasks.map((task) =>
								task.key === taskModal.task?.key
									? { ...task, ...value, key: task.key }
									: task,
							),
						});
					} else {
						patchSelected({
							tasks: [...selected.tasks, { ...value, key: nextKey() }],
						});
					}
					setTaskModal({ open: false, task: null });
				}}
			/>
		</Flex>
	);
}

export default TemplateEditor;
