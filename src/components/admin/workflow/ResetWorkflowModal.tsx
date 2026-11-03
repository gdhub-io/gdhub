"use client";

import { IconAlertTriangle, IconShieldLock } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Alert,
	App,
	Button,
	Checkbox,
	Flex,
	Modal,
	Radio,
	Select,
	Skeleton,
	Space,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import { useEffect, useState } from "react";
import type { LocalChange } from "@/services/workflow/diffFromTemplate";
import type { ResetMode, ResetPlan } from "@/services/workflow/planReset";
import { CheckpointLockAlert, checkpointLockOf } from "./CheckpointLock";
import { LocalChangeList } from "./LocalChangeList";
import { useWorkflowTemplates } from "./queries";
import styles from "./ResetWorkflowModal.module.scss";

const { Text } = Typography;

type Summary = ResetPlan["summary"];

const MODES: {
	value: ResetMode;
	title: string;
	description: string;
	recommended?: boolean;
	danger?: boolean;
}[] = [
	{
		value: "keep",
		title: "Keep completed tasks",
		description:
			"Re-applies the template structure. Tasks that exist in both keep their completed state and the current step is preserved.",
		recommended: true,
	},
	{
		value: "sync",
		title: "Sync new steps and tasks only",
		description:
			"Adds what is missing from the template. Nothing is removed, no progress is lost, local changes are kept.",
	},
	{
		value: "full",
		title: "Full reset",
		description:
			"Replaces every step and task with the template and clears all completed tasks. This project starts from the first step.",
		danger: true,
	},
];

export type ResetTarget = {
	id: string;
	projectName: string;
	templateId: string | null;
};

/**
 * Turning a project back onto a template.
 *
 * The preview is not written here: it comes from the server's own plan, so what
 * the admin reads is what the transaction will do rather than a second guess at
 * it. A full reset asks for one more deliberate act than the other two, because
 * it is the only one that destroys work.
 */
export function ResetWorkflowModal({
	targets,
	onClose,
}: {
	targets: ResetTarget[];
	onClose: () => void;
}) {
	const { message } = App.useApp();
	const queryClient = useQueryClient();
	const [mode, setMode] = useState<ResetMode>("keep");
	const [templateId, setTemplateId] = useState<string | undefined>();
	const [acknowledged, setAcknowledged] = useState(false);

	const single = targets.length === 1 ? targets[0] : null;
	const open = targets.length > 0;

	useEffect(() => {
		if (!open) return;
		setMode("keep");
		setTemplateId(single?.templateId ?? undefined);
		setAcknowledged(false);
	}, [open, single?.templateId]);

	const { data: templates } = useWorkflowTemplates(open);

	// Every project diffs against the template differently, so a preview only
	// means something for one of them. In bulk the mode is the whole promise.
	const {
		data: preview,
		isFetching: previewing,
		error: previewError,
	} = useQuery({
		queryKey: ["admin", "workflow-reset-preview", single?.id, mode, templateId],
		queryFn: () =>
			axios
				.post(`/api/admin/project-workflow/${single?.id}/reset`, {
					mode,
					templateId,
					dryRun: true,
				})
				.then((res) => res.data as { summary: Summary }),
		enabled: Boolean(single),
		// A running checkpoint is an answer, not a failure: no point asking again.
		retry: (count, error) => !checkpointLockOf(error) && count < 3,
	});

	const { mutateAsync: reset, isPending } = useMutation({
		mutationFn: async () => {
			// Sequentially: each reset is a transaction of its own, and a failure
			// halfway through must leave the ones before it intact and reported.
			const failed: string[] = [];
			for (const item of targets) {
				try {
					await axios.post(`/api/admin/project-workflow/${item.id}/reset`, {
						mode,
						templateId,
					});
				} catch {
					failed.push(item.projectName);
				}
			}
			return failed;
		},
		onSuccess: (failed) => {
			if (failed.length === targets.length) {
				message.error("Could not reset the workflow");
				return;
			}
			if (failed.length) {
				message.warning(`Could not reset: ${failed.join(", ")}`);
			} else {
				message.success(
					targets.length === 1
						? "Workflow reset"
						: `${targets.length} workflows reset`,
				);
			}
			queryClient.invalidateQueries({
				queryKey: ["admin", "project-workflows"],
			});
			queryClient.invalidateQueries({
				queryKey: ["admin", "project-workflow"],
			});
			onClose();
		},
	});

	const summary = preview?.summary;
	const isFull = mode === "full";
	const clearing = isFull ? (summary?.completedTotal ?? 0) : 0;
	const lock = checkpointLockOf(previewError);
	const blocked = (isFull && !acknowledged) || !!lock;

	return (
		<Modal
			open={open}
			onCancel={onClose}
			width={620}
			centered
			destroyOnHidden
			mask={{ closable: false }}
			title={
				<Flex vertical gap={2}>
					<span>
						{single
							? "Reset workflow to template"
							: `Reset ${targets.length} workflows to template`}
					</span>
					<Text type="secondary" className={styles.subtitle}>
						{single
							? `${single.projectName}${
									summary
										? ` · ${summary.completedTotal} completed task${
												summary.completedTotal === 1 ? "" : "s"
											}`
										: ""
								}`
							: targets.map((item) => item.projectName).join(", ")}
					</Text>
				</Flex>
			}
			footer={
				<Space>
					<Button onClick={onClose}>Cancel</Button>
					<Button
						type="primary"
						danger={isFull}
						loading={isPending}
						disabled={blocked || previewing}
						onClick={() => reset()}
					>
						{isFull ? "Reset and clear progress" : "Reset workflow"}
					</Button>
				</Space>
			}
		>
			<Flex vertical gap={16}>
				<Flex vertical gap={6}>
					<Text className={styles.label}>Template</Text>
					<Select
						value={templateId}
						onChange={setTemplateId}
						placeholder="Pick a template"
						options={(templates ?? []).map(
							(template: {
								id: string;
								name: string;
								title: string | null;
							}) => ({
								value: template.id,
								label:
									template.id === single?.templateId
										? `${template.title ?? template.name} — current`
										: (template.title ?? template.name),
							}),
						)}
					/>
					<Text type="secondary" className={styles.hint}>
						Pick another template to move the project onto a different path.
					</Text>
				</Flex>

				<Flex vertical gap={6}>
					<Text className={styles.label}>
						What happens to the current progress?
					</Text>
					<Radio.Group
						value={mode}
						onChange={(event) => setMode(event.target.value)}
						className={styles.modes}
					>
						<Flex vertical gap={8}>
							{MODES.map((option) => {
								const selected = option.value === mode;
								return (
									<Radio
										key={option.value}
										value={option.value}
										className={[
											styles.mode,
											selected &&
												(option.danger
													? styles.modeDangerSelected
													: styles.modeSelected),
										]
											.filter(Boolean)
											.join(" ")}
									>
										<Flex vertical gap={2}>
											<Flex align="center" gap={8} wrap>
												<span
													className={[
														styles.modeTitle,
														option.danger && styles.modeTitleDanger,
													]
														.filter(Boolean)
														.join(" ")}
												>
													{option.title}
												</span>
												{option.recommended && (
													<Tag color="green" variant="outlined">
														Recommended
													</Tag>
												)}
											</Flex>
											<Text type="secondary" className={styles.modeText}>
												{option.description}
											</Text>
										</Flex>
									</Radio>
								);
							})}
						</Flex>
					</Radio.Group>
				</Flex>

				<div
					className={[styles.changes, isFull && styles.changesDanger]
						.filter(Boolean)
						.join(" ")}
				>
					<Flex vertical gap={10}>
						<span className={styles.changesTitle}>What will change</span>
						{!single ? (
							<Text type="secondary" className={styles.bulkNote}>
								Each of the {targets.length} projects is compared with the
								template on its own, so the exact changes differ per project.
								Open one to see its plan before committing to all of them.
							</Text>
						) : lock ? (
							<CheckpointLockAlert lock={lock} />
						) : !summary || previewing ? (
							<Skeleton active paragraph={{ rows: 3 }} title={false} />
						) : (
							<ChangeList summary={summary} />
						)}
					</Flex>
				</div>

				{isFull && (
					<>
						<Alert
							type="error"
							showIcon
							icon={<IconAlertTriangle size={16} />}
							title="This cannot be undone"
							description={
								single
									? `${clearing} completed task${
											clearing === 1 ? "" : "s"
										} and every step this project added itself will be permanently lost.`
									: `Every completed task in ${targets.length} projects, and every step those projects added themselves, will be permanently lost.`
							}
						/>
						<Checkbox
							checked={acknowledged}
							onChange={(event) => setAcknowledged(event.target.checked)}
						>
							{single
								? `I understand that ${clearing} completed task${
										clearing === 1 ? "" : "s"
									} will be cleared`
								: `I understand that progress in ${targets.length} projects will be cleared`}
						</Checkbox>
					</>
				)}

				<Flex align="center" gap={6} className={styles.audit}>
					<IconShieldLock size={14} />
					This reset is recorded in the audit log.
				</Flex>
			</Flex>
		</Modal>
	);
}

/**
 * The plan in the terms an admin decides on: what appears, what disappears,
 * what survives, and where the project ends up standing.
 *
 * Rendered by the same list as the differences elsewhere, so a reader who has
 * seen one has seen them all.
 */
function ChangeList({ summary }: { summary: Summary }) {
	const plural = (count: number, noun: string) =>
		`${count} ${noun}${count === 1 ? "" : "s"}`;

	const changes: LocalChange[] = [];

	for (const name of summary.stepsAdded) {
		changes.push({
			kind: "added",
			text: `Step added \u2014 \u201c${name}\u201d`,
		});
	}
	// Frame 10.12: a project's own goal or text, back to the template's (GDHUB-97).
	for (const text of summary.ownCleared) {
		changes.push({ kind: "own", text });
	}
	for (const name of summary.stepsRemoved) {
		changes.push({
			kind: "removed",
			text: `Step removed \u2014 \u201c${name}\u201d (not in the template)`,
		});
	}
	if (summary.tasksAdded || summary.tasksRemoved) {
		changes.push({
			kind: summary.tasksRemoved ? "removed" : "added",
			text: [
				summary.tasksAdded
					? `${plural(summary.tasksAdded, "task")} added`
					: null,
				summary.tasksRemoved
					? `${plural(summary.tasksRemoved, "task")} removed`
					: null,
			]
				.filter(Boolean)
				.join(", "),
		});
	}
	if (summary.completedTotal) {
		changes.push({
			kind:
				summary.completedKept === summary.completedTotal ? "added" : "removed",
			text: `${summary.completedKept} of ${summary.completedTotal} completed tasks are kept`,
		});
	}
	changes.push({
		kind: "moved",
		text: summary.currentStep.kept
			? `Current step stays on \u201c${summary.currentStep.name ?? "\u2014"}\u201d`
			: `Current step moves to \u201c${summary.currentStep.name ?? "\u2014"}\u201d`,
	});

	return <LocalChangeList changes={changes} />;
}

export default ResetWorkflowModal;
