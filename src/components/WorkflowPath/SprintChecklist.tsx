"use client";

import {
	IconChevronRight,
	IconCircleCheck,
	IconFileText,
	IconLayoutGridAdd,
	IconListCheck,
	IconNotebook,
	IconPackage,
	IconVideo,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Modal, Tag, Typography } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { AttachEvidenceModal } from "@/components/checkpoints/AttachEvidenceModal";
import CreateArtifactModal from "@/components/modals/CreateArtifactModal";
import { StatusDot } from "@/components/ui";
import { SCOPE_SESSION } from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { useMarkVerdictRead } from "@/hooks/checkpoints";
import {
	type ChecklistItem,
	type ChecklistKey,
	sprintChecklist,
} from "@/lib/checkpoint-checklist";
import { checkpointPathHref } from "@/lib/checkpoint-hrefs";
import type { CheckpointDto, CheckpointSprintDto } from "@/types/checkpoints";
import { CheckpointResult } from "./ClosedCheckpoint";
import { daysUntil, formatShort } from "./dates";
import styles from "./style.module.scss";

// The editor's tools touch `Element` as they load, so the modal cannot be
// rendered on the server.
const DevLogPostModal = dynamic(
	() =>
		import("@/components/modals/DevLogPostModal").then(
			(module) => module.DevLogPostModal,
		),
	{ ssr: false },
);

const ICON: Record<ChecklistKey, ReactNode> = {
	verdict: <IconFileText size={20} />,
	plan: <IconListCheck size={20} />,
	priorities: <IconVideo size={20} />,
	build: <IconPackage size={20} />,
	devlog: <IconNotebook size={20} />,
	artifacts: <IconLayoutGridAdd size={20} />,
};

export type SprintChecklistProps = {
	checkpoint: CheckpointDto;
	sprint: CheckpointSprintDto;
	project: { id: string; name: string; slug: string };
	/** The checkpoint before this one, for the verdict sprint 1 starts from. */
	previous?: { checkpoint: CheckpointDto; number: number } | null;
	canManage: boolean;
	/** The line over the rows: "By the end of Sprint 2 · 31 Oct". */
	head: ReactNode;
};

/**
 * What a sprint asks of the team, each line ticked from data, and the action
 * behind it while the sprint runs — on the path and on Curator's Review alike.
 */
export function SprintChecklist({
	checkpoint,
	sprint,
	project,
	previous = null,
	canManage,
	head,
}: SprintChecklistProps) {
	const { t } = useTranslate();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [modal, setModal] = useState<
		"results" | "build" | "devlog" | "artifacts" | null
	>(null);
	const markRead = useMarkVerdictRead(checkpoint.id);
	const { data: reports } = useQuery<{ number: number | null }[]>({
		queryKey: ["project-reports", project.id],
		queryFn: () =>
			axios
				.get("/api/user/project/reports", { params: { projectId: project.id } })
				.then((res) => res.data),
		enabled: modal === "devlog",
	});

	const sessions = checkpoint.sessions ?? [];
	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const curatorName = checkpoint.curator?.name?.split(" ")[0] ?? "";
	// Only the sprint under way takes actions; one behind is a record.
	const running = sprint.state === "current";
	const openSession = (index: number) =>
		router.push(
			checkpointPathHref(project.slug, checkpoint.number ?? 1, index),
		);
	const refresh = () =>
		queryClient.invalidateQueries({ queryKey: ["checkpoint", checkpoint.id] });

	const checklist = sprintChecklist(checkpoint, sprint, !!previous);
	const owed = checklist.filter((item) => !item.optional);

	// Day 1's plan and day 15's change, each saying what it waits for.
	const planLabel = (item: ChecklistItem) => {
		if (sprint.number === 3) {
			if (item.done)
				return t(
					"workflow.path.check.planFixed",
					"The tasks are fixed until the verdict",
				);
			return item.step === "waiting"
				? isAI
					? t(
							"workflow.path.check.planAfterReview",
							"Revise the tasks after the curator's review",
						)
					: t("workflow.path.check.planOnCall", "Revise the tasks on the call")
				: t(
						"workflow.path.check.planRevise",
						"Revise the tasks, then confirm them",
					);
		}
		if (item.done)
			return t("workflow.path.check.planReady", "The plan is ready");
		if (!isAI)
			return t(
				"workflow.path.check.planDraft",
				"Draft the tasks for the first call",
			);
		return {
			write: t("workflow.path.check.planWrite", "Write the tasks"),
			send: t(
				"workflow.path.check.planSend",
				"Send the tasks for the curator's check",
			),
			approve: t(
				"workflow.path.check.planApprove",
				"The tasks are checked: approve the plan",
			),
		}[item.step as "write" | "send" | "approve"];
	};

	const itemLabel = (item: ChecklistItem) =>
		({
			verdict: t(
				"workflow.path.check.verdict",
				"Read the Checkpoint {number} verdict",
				{ number: String(previous?.number) },
			),
			plan: planLabel(item),
			priorities:
				item.call === "missed"
					? t("workflow.path.check.callMissed", "{name} didn't join the call", {
							name: curatorName,
						})
					: item.call === "noTeam"
						? t(
								"workflow.path.check.callNoTeam",
								"Nobody from the team joined the call with {name}",
								{ name: curatorName },
							)
						: t(
								"workflow.path.check.priorities",
								"Set sprint priorities with {name}",
								{ name: curatorName },
							),
			build: isAI
				? t(
						"workflow.path.check.buildVideo",
						"Upload a video of the current build",
					)
				: t("workflow.path.check.build", "Upload the current build"),
			devlog: t("workflow.path.check.devlog", "Write the sprint devlog"),
			artifacts: t("workflow.path.check.evidence", "Attach evidence"),
		})[item.key];

	/** The line's date on the right; today's is marked, a missed one is red. */
	const itemDue = (item: ChecklistItem) => {
		if (item.added !== undefined)
			return (
				<span className={styles.tertiary}>
					{item.added
						? t(
								"workflow.path.check.artifactsAdded",
								"{n, plural, one {# artifact added} other {# artifacts added}}",
								{ n: item.added },
							)
						: t("workflow.path.check.artifactsNone", "None added yet")}
				</span>
			);
		if (!item.dueAt) return null;
		const days = daysUntil(item.dueAt);
		const date = formatShort(item.dueAt);
		// A call behind is a fact, whoever came: its day, not a debt.
		if (item.done || item.call)
			return <span className={styles.tertiary}>{date}</span>;
		if (days < 0)
			return (
				<Typography.Text type="danger">
					{t("workflow.path.due.overdue", "overdue since {date}", { date })}
				</Typography.Text>
			);
		const label =
			item.key === "priorities" || item.key === "verdict"
				? t("workflow.path.check.at-session", "at the session {date}", { date })
				: t("workflow.path.due.on", "due {date}", { date });
		return (
			<>
				{days === 0 && (
					<StatusDot
						tone="danger"
						label={t("workflow.path.due.todayTag", "Today")}
					/>
				)}
				{label}
			</>
		);
	};

	const openItem = (key: ChecklistKey) => {
		if (key === "verdict") {
			setModal("results");
			if (!checkpoint.previousVerdictReadAt) markRead.mutate();
			return;
		}
		if (key === "plan") {
			openSession(sprint.number === 3 ? SCOPE_SESSION : 1);
			return;
		}
		if (key === "priorities") {
			openSession(sprint.number);
			return;
		}
		setModal(key);
	};

	const row = (item: ChecklistItem) => {
		// The priorities are set in the call: the line opens it, as Join session does.
		const actionable =
			running &&
			(item.key === "priorities"
				? sessions.some((session) => session.index === sprint.number)
				: canManage && !item.done && item.key !== "verdict");
		const due = itemDue(item);
		const body = (
			<>
				{item.done ? (
					<IconCircleCheck size={20} className={styles.taskIconDone} />
				) : (
					ICON[item.key]
				)}
				<span
					className={`${styles.itemText}${item.done ? ` ${styles.secondary}` : ""}`}
				>
					{itemLabel(item)}
				</span>
				{item.optional && (
					<Tag className={styles.optionalTag}>
						{t("workflow.tasks.optional", "Optional")}
					</Tag>
				)}
				{due && <span className={styles.itemDue}>{due}</span>}
				{item.key === "verdict" && (
					<Button
						type="text"
						size="small"
						className={styles.viewResults}
						onClick={() => openItem("verdict")}
					>
						{t("workflow.path.check.view-results", "View results")}
					</Button>
				)}
				{actionable && (
					<IconChevronRight size={16} className={styles.chevron} />
				)}
			</>
		);

		return actionable ? (
			// ui-guard-ignore the whole checklist row is the action, as in frame d6Yh7
			<button
				key={item.key}
				type="button"
				className={styles.checklistItem}
				onClick={() => openItem(item.key)}
			>
				{body}
			</button>
		) : (
			<div key={item.key} className={styles.checklistItem}>
				{body}
			</div>
		);
	};

	return (
		<div>
			<div className={styles.checklistHead}>
				{head}
				<span className={styles.meta}>
					{t("workflow.path.count", "{done} of {total}", {
						done: String(owed.filter((item) => item.done).length),
						total: String(owed.length),
					})}
				</span>
			</div>
			{checklist.map(row)}

			{previous && (
				<Modal
					open={modal === "results"}
					onCancel={() => setModal(null)}
					footer={null}
					title={t(
						"workflow.path.results.title",
						"Checkpoint {number} results",
						{ number: String(previous.number) },
					)}
				>
					<div className={styles.result}>
						<CheckpointResult checkpoint={previous.checkpoint} />
					</div>
				</Modal>
			)}
			{running && canManage && (
				<>
					<DevLogPostModal
						projectId={project.id}
						projectName={project.name}
						stageName={checkpoint.stageName}
						nextNumber={
							Math.max(0, ...(reports ?? []).map((r) => r.number ?? 0)) + 1
						}
						open={modal === "devlog"}
						onClose={() => setModal(null)}
						onSave={() => {
							setModal(null);
							refresh();
						}}
					/>
					<CreateArtifactModal
						open={modal === "build"}
						initialKind={isAI ? "video" : "build"}
						projectId={project.id}
						stageName={checkpoint.stageName}
						onCreate={() => {
							setModal(null);
							refresh();
						}}
						onCancel={() => setModal(null)}
					/>
					<AttachEvidenceModal
						open={modal === "artifacts"}
						checkpoint={checkpoint}
						onClose={() => setModal(null)}
					/>
				</>
			)}
		</div>
	);
}
