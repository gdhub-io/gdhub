"use client";

import {
	IconBolt,
	IconCheck,
	IconExternalLink,
	IconGitCompare,
	IconHandStop,
	IconPencil,
	IconPlus,
	IconRotateClockwise,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	App,
	Breadcrumb,
	Button,
	Card,
	Checkbox,
	Collapse,
	Flex,
	Progress,
	Skeleton,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StepEditModal from "@/components/admin/WorkflowEditor/StepEditModal";
import TaskEditModal from "@/components/admin/WorkflowEditor/TaskEditModal";
import { describeCondition } from "@/services/workflow/describeCondition";
import type { LocalChange } from "@/services/workflow/diffFromTemplate";
import {
	checkpointLockOf,
	checkpointLockText,
	checkpointLockTitle,
} from "./CheckpointLock";
import { LocalChangeList } from "./LocalChangeList";
import styles from "./ProjectWorkflowEditor.module.scss";
import { ResetWorkflowModal } from "./ResetWorkflowModal";

const { Title, Text } = Typography;

type TaskDraft = {
	key: string;
	id?: string;
	name: string;
	description?: string | null;
	required: boolean;
	done: boolean;
	finishedAt?: string | null;
	condition?: PrismaJson.WorkflowTaskCondition | null;
};

type StepDraft = {
	key: string;
	id?: string;
	name: string;
	description?: string | null;
	tasks: TaskDraft[];
};

let keySeed = 0;
const nextKey = () => `draft-${++keySeed}`;

const norm = (value: string | null | undefined) =>
	(value ?? "").trim().toLowerCase();

export function ProjectWorkflowEditor({ id }: { id: string }) {
	const { message, modal } = App.useApp();
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ["admin", "project-workflow", id],
		queryFn: () =>
			axios
				.get(`/api/admin/project-workflow/${id}`)
				.then((res) => res.data as ProjectWorkflowResponse | null),
	});

	const [steps, setSteps] = useState<StepDraft[]>([]);
	const [currentStepId, setCurrentStepId] = useState<string | null>(null);
	const [dirty, setDirty] = useState(false);
	const [expanded, setExpanded] = useState<string[]>([]);
	const [resetOpen, setResetOpen] = useState(false);
	const [stepModal, setStepModal] = useState(false);
	const [taskModal, setTaskModal] = useState<{
		stepKey: string;
		task: TaskDraft | null;
	} | null>(null);

	useEffect(() => {
		if (!data) return;
		const drafts = data.steps.map((step) => ({
			key: nextKey(),
			id: step.id,
			name: step.name,
			description: step.description,
			tasks: step.tasks.map((task) => ({
				key: nextKey(),
				id: task.id,
				name: task.name ?? "",
				description: task.description,
				required: task.required,
				done: task.done,
				finishedAt: task.finishedAt,
				condition: task.condition,
			})),
		}));
		setSteps(drafts);
		setCurrentStepId(data.currentStepId ?? null);
		// The step the project is actually on is the one you came here to look at.
		const current = drafts.find((step) => step.id === data.currentStepId);
		setExpanded(current ? [current.key] : []);
		setDirty(false);
	}, [data]);

	const patch = (next: StepDraft[]) => {
		setSteps(next);
		setDirty(true);
	};

	const { mutateAsync: save, isPending: isSaving } = useMutation({
		mutationFn: () =>
			axios.put(`/api/admin/project-workflow/${id}`, {
				currentStepId,
				steps: steps.map((step) => ({
					id: step.id,
					name: step.name,
					description: step.description ?? undefined,
					tasks: step.tasks.map((task) => ({
						id: task.id,
						name: task.name,
						description: task.description ?? undefined,
						required: task.required,
						done: task.done,
						condition: task.condition ?? null,
					})),
				})),
			}),
		onSuccess: () => {
			message.success("Workflow saved");
			setDirty(false);
			queryClient.invalidateQueries({
				queryKey: ["admin", "project-workflow", id],
			});
			queryClient.invalidateQueries({
				queryKey: ["admin", "project-workflows"],
			});
		},
		onError: (error) => {
			const lock = checkpointLockOf(error);
			if (lock) {
				modal.warning({
					title: checkpointLockTitle,
					content: checkpointLockText(lock),
				});
				return;
			}
			message.error("Could not save the workflow");
		},
	});

	const totals = useMemo(() => {
		const tasks = steps.flatMap((step) => step.tasks);
		const done = tasks.filter((task) => task.done).length;
		return {
			done,
			total: tasks.length,
			percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
		};
	}, [steps]);

	// Which steps and tasks this project holds beyond the template it came from.
	const extras = useMemo(() => {
		const templateSteps = data?.template?.steps ?? [];
		const byName = new Map(
			templateSteps.map((step) => [norm(step.name), step]),
		);
		return {
			step: (name: string) =>
				templateSteps.length > 0 && !byName.has(norm(name)),
			task: (stepName: string, taskName: string) => {
				const templateStep = byName.get(norm(stepName));
				if (!templateStep) return false;
				return !(templateStep.tasks ?? []).some(
					(task) => norm(task.name) === norm(taskName),
				);
			},
		};
	}, [data?.template?.steps]);

	/**
	 * Deleting a task the project already completed throws away a record of work
	 * done, so that case asks first; an unfinished one just goes.
	 */
	const removeTask = (stepKey: string, task: TaskDraft) => {
		const drop = () =>
			patch(
				steps.map((step) =>
					step.key === stepKey
						? {
								...step,
								tasks: step.tasks.filter((item) => item.key !== task.key),
							}
						: step,
				),
			);

		if (!task.done) {
			drop();
			return;
		}

		modal.confirm({
			title: `Delete “${task.name}”?`,
			content:
				"This task is marked done. Deleting it removes that from the project's progress when you save.",
			okText: "Delete",
			okButtonProps: { danger: true },
			onOk: drop,
		});
	};

	const handleSave = () => {
		// The column is rewritten wholesale; an empty list would leave the project
		// with no workflow at all. The server refuses it, and so does the button.
		if (!steps.length) {
			message.error("A workflow needs at least one step");
			return;
		}
		if (steps.some((step) => !step.name.trim())) {
			message.error("Every step needs a name");
			return;
		}
		save();
	};

	if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;
	if (!data)
		return <Text type="secondary">This workflow no longer exists.</Text>;

	return (
		<Flex vertical gap={16}>
			<Breadcrumb
				items={[
					{ title: <Link href="/admin/workflows">Workflows</Link> },
					{
						title: (
							<Link href="/admin/workflows?tab=projects">
								Project workflows
							</Link>
						),
					},
					{ title: data.project.name },
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
					<Flex align="center" gap={10} wrap>
						<Title level={1} className={styles.title}>
							{data.project.name}
						</Title>
						{data.template && (
							<Tag variant="filled" className={styles.templateChip}>
								{data.template.title ?? data.template.name}
							</Tag>
						)}
						{data.localChanges.length > 0 && (
							<Tag color="warning" variant="outlined">
								{data.localChanges.length} local change
								{data.localChanges.length === 1 ? "" : "s"}
							</Tag>
						)}
					</Flex>
					<Text type="secondary" className={styles.meta}>
						{data.project.author?.name
							? `by ${data.project.author.name} · `
							: ""}
						started {dayjs(data.createdAt).fromNow()} · last activity{" "}
						{dayjs(data.updatedAt).fromNow()}
					</Text>
				</Flex>

				<Flex align="center" gap={10} wrap>
					{dirty && (
						<Flex align="center" gap={6} className={styles.unsaved}>
							<span className={styles.unsavedDot} />
							Unsaved changes
						</Flex>
					)}
					{/* Resetting lives with the template card at the foot of the page,
					    next to the changes it would discard. */}
					<Button
						icon={<IconExternalLink size={16} />}
						href={`/project/${data.project.slug}`}
						target="_blank"
					>
						Open project
					</Button>
					<Button type="primary" loading={isSaving} onClick={handleSave}>
						Save
					</Button>
				</Flex>
			</Flex>

			<Card className={styles.card} styles={{ body: { padding: 0 } }}>
				<Flex
					align="flex-start"
					justify="space-between"
					gap={16}
					wrap
					className={styles.cardHeader}
				>
					<Flex vertical gap={2}>
						<span className={styles.cardTitle}>Overall progress</span>
						<Text type="secondary" className={styles.hint}>
							The whole path at a glance — steps are edited below
						</Text>
					</Flex>
					<Flex align="baseline" gap={10}>
						<Text type="secondary" className={styles.progressNumbers}>
							{totals.done} of {totals.total} tasks
						</Text>
						<span className={styles.percent}>{totals.percent}%</span>
					</Flex>
				</Flex>

				<Flex vertical className={styles.cardBody}>
					<Progress percent={totals.percent} showInfo={false} />
					<Flex gap={4} className={styles.stepper}>
						{steps.map((step, index) => {
							const done =
								step.tasks.length > 0 && step.tasks.every((task) => task.done);
							const isCurrent = Boolean(step.id) && step.id === currentStepId;
							return (
								// Read-only on purpose: the timeline is the overview, and the
								// step cards below are where a step is changed.
								<div key={step.key} className={styles.stepperItem}>
									<Flex vertical gap={6}>
										<Flex align="flex-start" gap={8}>
											<Bullet
												done={done}
												current={isCurrent}
												index={index + 1}
											/>
											<span className={styles.stepperName}>{step.name}</span>
										</Flex>
										<span className={styles.stepperCount}>
											{step.tasks.filter((task) => task.done).length} /{" "}
											{step.tasks.length} tasks
										</span>
										<Flex gap={6} wrap className={styles.stepperTags}>
											{isCurrent && (
												<Tag color="processing" variant="outlined">
													Current step
												</Tag>
											)}
											{extras.step(step.name) && (
												<Tag variant="outlined">Custom step</Tag>
											)}
										</Flex>
									</Flex>
								</div>
							);
						})}
					</Flex>
				</Flex>
			</Card>

			<Flex align="center" justify="space-between" gap={12} wrap>
				<Flex align="baseline" gap={8} wrap>
					<span className={styles.sectionHeading}>Project steps</span>
					<Text type="secondary" className={styles.hint}>
						— this project&rsquo;s own copy of the workflow
					</Text>
				</Flex>
				<Button
					icon={<IconPlus size={14} />}
					onClick={() => setStepModal(true)}
				>
					Add step
				</Button>
			</Flex>

			<Collapse
				activeKey={expanded}
				onChange={(keys) =>
					setExpanded(Array.isArray(keys) ? keys : [keys as string])
				}
				items={steps.map((step, index) => {
					const done =
						step.tasks.length > 0 && step.tasks.every((task) => task.done);
					const isCurrent = Boolean(step.id) && step.id === currentStepId;

					return {
						key: step.key,
						className: styles.stepPanel,
						label: (
							<Flex align="center" gap={10} wrap>
								<Bullet done={done} current={isCurrent} index={index + 1} />
								<span className={styles.stepName}>{step.name}</span>
								{isCurrent && (
									<Tag color="processing" variant="outlined">
										Current step
									</Tag>
								)}
								{extras.step(step.name) && (
									<Tag variant="outlined">Not in template</Tag>
								)}
							</Flex>
						),
						extra: (
							<Flex
								align="center"
								gap={10}
								onClick={(event) => event.stopPropagation()}
							>
								<span className={styles.stepCount}>
									{step.tasks.filter((task) => task.done).length} /{" "}
									{step.tasks.length} tasks
									{step.tasks.some((task) => task.required)
										? ` · ${
												step.tasks.filter((task) => task.required).length
											} required`
										: ""}
								</span>
								{!isCurrent && step.id && (
									<Button
										size="small"
										onClick={() => {
											setCurrentStepId(step.id ?? null);
											setDirty(true);
										}}
									>
										Set current
									</Button>
								)}
								<Button
									size="small"
									type="text"
									danger
									icon={<IconTrash size={15} />}
									onClick={() =>
										modal.confirm({
											title: `Delete “${step.name}”?`,
											content:
												"The step and the progress recorded against it are removed from this project when you save.",
											okText: "Delete",
											okButtonProps: { danger: true },
											onOk: () =>
												patch(steps.filter((item) => item.key !== step.key)),
										})
									}
								/>
							</Flex>
						),
						children: (
							<Flex vertical gap={4}>
								{step.description && (
									<Text type="secondary" className={styles.hint}>
										{step.description}
									</Text>
								)}

								{step.tasks.map((task) => (
									<Flex
										key={task.key}
										align="flex-start"
										justify="space-between"
										gap={12}
										wrap
										className={styles.taskRow}
									>
										<Flex align="flex-start" gap={10}>
											<Checkbox
												checked={task.done}
												onChange={(event) =>
													patch(
														steps.map((item) =>
															item.key === step.key
																? {
																		...item,
																		tasks: item.tasks.map((candidate) =>
																			candidate.key === task.key
																				? {
																						...candidate,
																						done: event.target.checked,
																					}
																				: candidate,
																		),
																	}
																: item,
														),
													)
												}
											/>
											<Flex vertical gap={2}>
												<Flex align="center" gap={8} wrap>
													<span
														className={
															task.done
																? `${styles.taskName} ${styles.taskDone}`
																: styles.taskName
														}
													>
														{task.name}
													</span>
													{/* What the step cannot be finished without — the
													    difference between behind and blocked. */}
													{task.required && (
														<Tag color="orange" variant="outlined">
															Required
														</Tag>
													)}
												</Flex>
												<span className={styles.taskNote}>
													{task.done && task.finishedAt
														? `Completed ${dayjs(task.finishedAt).fromNow()}`
														: (task.description ?? "")}
												</span>
											</Flex>
										</Flex>

										<Flex align="center" gap={8}>
											{extras.task(step.name, task.name) && (
												<Tag variant="outlined" className={styles.conditionTag}>
													Not in template
												</Tag>
											)}
											<Tag
												variant="outlined"
												color={task.condition ? "blue" : undefined}
												className={styles.conditionTag}
												icon={
													task.condition ? (
														<IconBolt size={11} />
													) : (
														<IconHandStop size={11} />
													)
												}
											>
												{task.condition
													? `Auto · ${describeCondition(task.condition)}`
													: "Manual"}
											</Tag>
											<Button
												size="small"
												type="text"
												icon={<IconPencil size={15} />}
												onClick={() =>
													setTaskModal({ stepKey: step.key, task })
												}
											/>
											<Button
												size="small"
												type="text"
												danger
												icon={<IconTrash size={15} />}
												onClick={() => removeTask(step.key, task)}
											/>
										</Flex>
									</Flex>
								))}

								<Flex justify="flex-start">
									<Button
										size="small"
										type="text"
										icon={<IconPlus size={14} />}
										onClick={() =>
											setTaskModal({ stepKey: step.key, task: null })
										}
									>
										Add task
									</Button>
								</Flex>
							</Flex>
						),
					};
				})}
			/>

			{data.template && (
				<Card className={styles.card} styles={{ body: { padding: 0 } }}>
					<Flex
						align="flex-start"
						justify="space-between"
						gap={16}
						wrap
						className={styles.cardHeader}
					>
						<Flex vertical gap={2}>
							<span className={styles.cardTitle}>Template</span>
							<Text type="secondary" className={styles.hint}>
								Created from {data.template.title ?? data.template.name} · the
								template was updated {dayjs(data.template.updatedAt).fromNow()}
								{data.localChanges.length
									? `, this copy has ${data.localChanges.length} local change${
											data.localChanges.length === 1 ? "" : "s"
										}.`
									: " and this copy still matches it."}
							</Text>
						</Flex>
						<Flex align="center" gap={8}>
							<Button
								icon={<IconGitCompare size={15} />}
								href={`/admin/workflow/${data.template.id}`}
							>
								Open template
							</Button>
							<Button
								icon={<IconRotateClockwise size={15} />}
								onClick={() => setResetOpen(true)}
							>
								Reset to template…
							</Button>
						</Flex>
					</Flex>

					{/* Folded by default: the header already says whether this copy
					    drifted, and a list that is often meant to be there does not need
					    to hold the foot of the page open to say so. */}
					{data.localChanges.length > 0 && (
						<Collapse
							ghost
							className={styles.changesPanel}
							items={[
								{
									key: "changes",
									label: (
										<span className={styles.changesTitle}>
											Local changes ({data.localChanges.length})
										</span>
									),
									children: <LocalChangeList changes={data.localChanges} />,
								},
							]}
						/>
					)}
				</Card>
			)}

			<ResetWorkflowModal
				targets={
					resetOpen
						? [
								{
									id,
									projectName: data.project.name,
									templateId: data.template?.id ?? null,
								},
							]
						: []
				}
				onClose={() => setResetOpen(false)}
			/>

			<StepEditModal
				visible={stepModal}
				isNew
				step={null}
				onClose={() => setStepModal(false)}
				onSave={(value: {
					name?: string;
					title?: string;
					description?: string;
				}) => {
					const name = value.name?.trim() || value.title?.trim() || "";
					patch([
						...steps,
						{
							key: nextKey(),
							name,
							description: value.description,
							tasks: [],
						},
					]);
					setStepModal(false);
				}}
			/>

			<TaskEditModal
				visible={Boolean(taskModal)}
				isNew={!taskModal?.task}
				task={taskModal?.task ?? null}
				onClose={() => setTaskModal(null)}
				onSave={(value: TaskDraft) => {
					if (!taskModal) return;
					patch(
						steps.map((step) => {
							if (step.key !== taskModal.stepKey) return step;
							if (!taskModal.task) {
								return {
									...step,
									tasks: [
										...step.tasks,
										{ ...value, key: nextKey(), done: false },
									],
								};
							}
							return {
								...step,
								tasks: step.tasks.map((task) =>
									task.key === taskModal.task?.key
										? { ...task, ...value, key: task.key }
										: task,
								),
							};
						}),
					);
					setTaskModal(null);
				}}
			/>
		</Flex>
	);
}

function Bullet({
	done,
	current,
	index,
}: {
	done: boolean;
	current: boolean;
	index: number;
}) {
	const className = [
		styles.bullet,
		done && styles.bulletDone,
		!done && current && styles.bulletCurrent,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<span className={className}>{done ? <IconCheck size={13} /> : index}</span>
	);
}

type ProjectWorkflowResponse = {
	id: string;
	createdAt: string;
	updatedAt: string;
	currentStepId: string | null;
	project: {
		id: string;
		name: string;
		slug: string;
		author?: { name: string | null } | null;
	};
	template: {
		id: string;
		name: string;
		title: string | null;
		updatedAt: string;
		steps: PrismaJson.WorkflowStep[];
	} | null;
	localChanges: LocalChange[];
	steps: {
		id: string;
		name: string;
		description: string | null;
		tasks: {
			id: string;
			name: string | null;
			description: string | null;
			required: boolean;
			done: boolean;
			finishedAt: string | null;
			condition: PrismaJson.WorkflowTaskCondition | null;
		}[];
	}[];
};

export default ProjectWorkflowEditor;
