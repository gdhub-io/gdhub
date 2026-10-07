import {
	IconArrowUpRight,
	IconChevronRight,
	IconCircleCheck,
	IconFileText,
	IconLayoutGridAdd,
	IconLock,
	IconNotebook,
	IconPackage,
	IconSparkles,
	IconVideo,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Modal, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { AttachEvidenceModal } from "@/components/checkpoints/AttachEvidenceModal";
import CreateArtifactModal from "@/components/modals/CreateArtifactModal";
import { DevLogPostModal } from "@/components/modals/DevLogPostModal";
import { AppAvatar } from "@/components/ui/AppAvatar";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointSessionContentStatus,
} from "@/config/prisma-enums";
import { useMarkVerdictRead } from "@/hooks/checkpoints";
import {
	type ChecklistItem,
	type ChecklistKey,
	sprintChecklist,
} from "@/lib/checkpoint-checklist";
import type {
	CheckpointDto,
	CheckpointSessionDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";
import { CheckpointResult } from "./ClosedCheckpoint";
import { daysUntil, formatRange, formatShort } from "./dates";
import { PathNode } from "./PathNode";
import { PulseChip } from "./PulseChip";
import styles from "./style.module.scss";

const ICON: Record<ChecklistKey, ReactNode> = {
	verdict: <IconFileText size={20} />,
	priorities: <IconVideo size={20} />,
	build: <IconPackage size={20} />,
	devlog: <IconNotebook size={20} />,
	artifacts: <IconLayoutGridAdd size={20} />,
};

export type RunningCheckpointProps = {
	checkpoint: CheckpointDto;
	project: { id: string; name: string; slug: string };
	/** The checkpoint before this one, for the verdict sprint 1 starts from. */
	previous: { checkpoint: CheckpointDto; number: number } | null;
	canManage: boolean;
};

/**
 * The checkpoint under way on the path: sprints behind it as one-line rows, the
 * current sprint as the one filled card, the next session as its own stop on
 * the rail, the sprints ahead, and the checkpoint itself at the end.
 */
export function RunningCheckpoint({
	checkpoint,
	project,
	previous,
	canManage,
}: RunningCheckpointProps) {
	const { t } = useTranslate();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [modal, setModal] = useState<
		"results" | "build" | "devlog" | "artifacts" | null
	>(null);
	const markRead = useMarkVerdictRead(checkpoint.id);

	const sprints = checkpoint.sprints ?? [];
	const sessions = checkpoint.sessions ?? [];
	const current =
		sprints.find((sprint) => sprint.state === "current") ?? sprints.at(-1);
	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const curatorName = checkpoint.curator?.name?.split(" ")[0] ?? "";
	const number = checkpoint.number ?? 1;
	const base = `/user/project/${project.slug}/workflow/cp${number}`;
	const sessionHref = (session: CheckpointSessionDto) =>
		`${base}/${isAI ? "review" : "call"}/${session.index}`;

	const { data: reports } = useQuery<{ number: number | null }[]>({
		queryKey: ["project-reports", project.id],
		queryFn: () =>
			axios
				.get("/api/user/project/reports", { params: { projectId: project.id } })
				.then((res) => res.data),
		enabled: modal === "devlog",
	});

	if (!current) return null;

	const refresh = () =>
		queryClient.invalidateQueries({ queryKey: ["checkpoint", checkpoint.id] });

	const checklist = sprintChecklist(checkpoint, current, !!previous);
	const nextSession = sessions.find(
		(session) => session.index === current.number + 1,
	);
	const openingSession = sessions.find(
		(session) => session.index === current.number,
	);
	const finalSession = sessions.at(-1);

	const dueLabel = (iso: string) => {
		const days = daysUntil(iso);
		if (days === 0) return t("workflow.path.due.today", "due today");
		if (days === 1) return t("workflow.path.due.tomorrow", "due tomorrow");
		if (days < 0)
			return t("workflow.path.due.overdue", "overdue since {date}", {
				date: formatShort(iso),
			});
		return t("workflow.path.due.on", "due {date}", { date: formatShort(iso) });
	};

	const itemLabel = (item: ChecklistItem) =>
		({
			verdict: t(
				"workflow.path.check.verdict",
				"Read the Checkpoint {number} verdict",
				{ number: String(previous?.number ?? number - 1) },
			),
			priorities: t(
				"workflow.path.check.priorities",
				"Set sprint priorities with {name}",
				{ name: curatorName },
			),
			build: t("workflow.path.check.build", "Upload the current build"),
			devlog: t("workflow.path.check.devlog", "Write the sprint devlog"),
			artifacts: t("workflow.path.check.artifacts", "Attach artifacts"),
		})[item.key];

	const itemMeta = (item: ChecklistItem) => {
		if (item.key === "priorities" && item.dueAt)
			return item.done
				? t("workflow.path.check.session-on", "session {date}", {
						date: formatShort(item.dueAt),
					})
				: t("workflow.path.check.at-session", "at the session {date}", {
						date: formatShort(item.dueAt),
					});
		if (!item.done && item.dueAt) return dueLabel(item.dueAt);
		return null;
	};

	const openItem = (key: ChecklistKey) => {
		if (key === "verdict") {
			setModal("results");
			markRead.mutate();
			return;
		}
		if (key === "build" || key === "devlog" || key === "artifacts")
			setModal(key);
	};

	const checklistRow = (item: ChecklistItem) => {
		const actionable =
			canManage &&
			!item.done &&
			item.key !== "priorities" &&
			item.key !== "verdict";
		const body = (
			<>
				{item.done ? (
					<IconCircleCheck size={20} className={styles.taskIconDone} />
				) : (
					ICON[item.key]
				)}
				<span className={styles.itemText}>
					<span className={item.done ? styles.secondary : undefined}>
						{itemLabel(item)}
					</span>
					{itemMeta(item) && (
						<>
							<span className={styles.sep}>·</span>
							<span className={styles.secondary}>{itemMeta(item)}</span>
						</>
					)}
				</span>
				{item.key === "verdict" && (
					<Button
						type="text"
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

	const who = (
		<span className={styles.chip}>
			{isAI ? (
				<span className={styles.chipIcon}>
					<IconSparkles size={12} />
				</span>
			) : (
				<AppAvatar src={checkpoint.curator?.image} size={20}>
					{curatorName[0]}
				</AppAvatar>
			)}
			{isAI ? t("workflow.path.ai-curator", "AI curator") : curatorName}
		</span>
	);

	const outcomes = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome && !item.cut,
	);

	const doneSprint = (sprint: CheckpointSprintDto) => {
		const items = sprintChecklist(checkpoint, sprint, !!previous);
		const devlog = checkpoint.reports?.find(
			(report) => report.sprint === sprint.number,
		);
		// What the evidence proved by the end of this sprint, counted once per outcome.
		const proved = new Set(
			(checkpoint.evidence ?? [])
				.filter((item) => item.sprint !== null && item.sprint <= sprint.number)
				.flatMap((item) => item.itemIds),
		);

		return (
			<PathNode key={sprint.number} marker="done" offset={24}>
				<div className={styles.summary}>
					<span className={styles.sprintTitle}>
						{t("workflow.path.sprint.of", "Sprint {number} of 4", {
							number: String(sprint.number),
						})}
						<span className={styles.dates}>
							{formatRange(sprint.from, sprint.to)}
						</span>
					</span>
					<div className={styles.summaryMeta}>
						{devlog && (
							<Link href={`/devlog/${devlog.id}`} className={styles.link}>
								<IconNotebook size={16} className={styles.secondary} />
								{t("workflow.path.sprint.devlog", "Devlog")}
								<IconArrowUpRight size={14} />
							</Link>
						)}
						{outcomes.length > 0 && (
							<span className={styles.metaItem}>
								<IconLayoutGridAdd size={16} />
								{t(
									"workflow.path.sprint.artifacts",
									"Artifacts {done} of {total}",
									{
										done: String(
											outcomes.filter((item) => proved.has(item.id)).length,
										),
										total: String(outcomes.length),
									},
								)}
							</span>
						)}
						<span className={styles.metaItem}>
							<IconCircleCheck size={16} />
							{t("workflow.path.sprint.tasks", "{done} of {total} tasks", {
								done: String(items.filter((item) => item.done).length),
								total: String(items.length),
							})}
						</span>
						<PulseChip rows={checkpoint.pulses ?? []} sprint={sprint.number} />
					</div>
				</div>
			</PathNode>
		);
	};

	const sessionCard = (session: CheckpointSessionDto) => {
		const days = daysUntil(session.scheduledAt);
		const when = dayjs.utc(session.scheduledAt);
		const ready =
			session.contentStatus === CheckpointSessionContentStatus.Ready;
		const opens =
			session.index <= 4
				? t("workflow.path.session.opens", "opens Sprint {number}", {
						number: String(session.index),
					})
				: t("workflow.path.session.final", "the final one");

		let action: ReactNode;
		if (isAI) {
			action = (
				<Button
					type="primary"
					icon={<IconFileText size={16} />}
					disabled={!ready}
					onClick={() => router.push(sessionHref(session))}
				>
					{t("workflow.path.session.open-review", "Open review")}
				</Button>
			);
		} else if (days > 0) {
			action = (
				<Button disabled icon={<IconLock size={16} />}>
					{days === 1
						? t("workflow.path.session.join-tomorrow", "Join tomorrow")
						: t("workflow.path.session.join-in", "Join in {days} days", {
								days: String(days),
							})}
				</Button>
			);
		} else {
			action = (
				<Button
					type="primary"
					icon={<IconVideo size={16} />}
					onClick={() => router.push(sessionHref(session))}
				>
					{t("workflow.path.session.join", "Join session")}
				</Button>
			);
		}

		return (
			<PathNode
				key={`session-${session.index}`}
				marker={isAI ? "review" : "session"}
			>
				<div className={styles.session}>
					<div className={styles.sessionWho}>
						{isAI ? (
							<span className={`${styles.chipIcon} ${styles.aiTile}`}>
								<IconSparkles size={24} />
							</span>
						) : (
							<AppAvatar src={checkpoint.curator?.image} size={56}>
								{curatorName[0]}
							</AppAvatar>
						)}
						<div className={styles.sessionText}>
							<span>{when.format("MMMM D")}</span>
							<span className={styles.sessionWhen}>
								{isAI
									? t(
											"workflow.path.session.review-title",
											"Sprint {number} review",
											{
												number: String(session.index - 1),
											},
										)
									: session.timeKnown
										? `${when.format("dddd")} · ${when.format("HH:mm")}`
										: when.format("dddd")}
							</span>
							<span>
								{isAI
									? t(
											"workflow.path.session.review-sub",
											"Written by the AI curator from your devlog, artifacts and activity",
										)
									: `${t("workflow.path.session.with", "Session with {name}", {
											name: curatorName,
										})} · ${opens}`}
							</span>
						</div>
					</div>
					{action}
				</div>
			</PathNode>
		);
	};

	const nextLabel = nextSession
		? isAI
			? t(
					"workflow.path.check.head-review",
					"Before the next review · {date}",
					{
						date: formatShort(nextSession.scheduledAt),
					},
				)
			: t("workflow.path.check.head", "Before the next session · {date}", {
					date: formatShort(nextSession.scheduledAt),
				})
		: t("workflow.path.check.head-final", "Before the checkpoint");

	return (
		<>
			{sprints.filter((sprint) => sprint.state === "done").map(doneSprint)}

			<PathNode marker="current">
				<div className={styles.sprint}>
					<div className={styles.sprintHead}>
						<span className={styles.sprintTitle}>
							{t("workflow.path.sprint.of", "Sprint {number} of 4", {
								number: String(current.number),
							})}
							<span className={styles.toward}>
								{t(
									"workflow.path.sprint.toward",
									"toward Checkpoint {number}",
									{
										number: String(number),
									},
								)}
							</span>
						</span>
						<span className={styles.sprintMeta}>
							{formatRange(current.from, current.to)}
							{checkpoint.day !== null &&
								` · ${t("workflow.path.sprint.day", "day {day}", {
									day: String(checkpoint.day - current.firstDay + 1),
								})}`}
							<PulseChip
								rows={checkpoint.pulses ?? []}
								sprint={current.number}
							/>
						</span>
					</div>

					{openingSession &&
						(openingSession.endedAt ||
							(isAI && openingSession.contentStatus)) && (
							<div className={styles.sessionDone}>
								{isAI ? <IconSparkles size={16} /> : <IconVideo size={16} />}
								<span>
									{isAI
										? t(
												"workflow.path.session.review-title",
												"Sprint {number} review",
												{
													number: String(openingSession.index - 1),
												},
											)
										: t("workflow.path.session.with", "Session with {name}", {
												name: curatorName,
											})}
								</span>
								<span className={`${styles.meta} ${styles.grow}`}>
									{formatShort(openingSession.scheduledAt)}
								</span>
								<Typography.Link
									className={styles.link}
									onClick={() => router.push(sessionHref(openingSession))}
								>
									{isAI
										? t("workflow.path.session.review", "Review")
										: t("workflow.path.session.notes", "Notes")}
									<IconArrowUpRight size={14} />
								</Typography.Link>
							</div>
						)}

					<div>
						<div className={styles.checklistHead}>
							{nextLabel}
							<span className={styles.meta}>
								{t("workflow.path.count", "{done} of {total}", {
									done: String(checklist.filter((item) => item.done).length),
									total: String(checklist.length),
								})}
							</span>
						</div>
						{checklist.map(checklistRow)}
					</div>
				</div>
			</PathNode>

			{nextSession && nextSession.index <= 4 && sessionCard(nextSession)}

			{sprints.some((sprint) => sprint.state === "ahead") && (
				<PathNode marker="none">
					<div role="heading" aria-level={3} className={styles.upNextTitle}>
						{t("workflow.path.up-next", "Up next")}
					</div>
				</PathNode>
			)}
			{sprints
				.filter((sprint) => sprint.state === "ahead")
				.map((sprint) => {
					const days = daysUntil(sprint.from);
					return (
						<PathNode key={sprint.number} marker="sprint">
							<div className={styles.futureSprint}>
								<span className={styles.futureDates}>
									{formatRange(sprint.from, sprint.to)}
									{days > 0 &&
										` · ${
											days === 1
												? t("workflow.path.starts-tomorrow", "starts tomorrow")
												: t(
														"workflow.path.starts-in",
														"starts in {days} days",
														{
															days: String(days),
														},
													)
										}`}
								</span>
								<span className={styles.title}>
									{t("workflow.path.sprint.name", "Sprint {number}", {
										number: String(sprint.number),
									})}
								</span>
								<div className={styles.with}>
									{isAI
										? t("workflow.path.review-by", "review by")
										: t("workflow.path.with", "with")}
									{who}
								</div>
							</div>
						</PathNode>
					);
				})}

			<PathNode marker="gate" rail="dashed">
				<div className={styles.gate}>
					{finalSession && (
						<span className={styles.meta}>
							{isAI
								? t(
										"workflow.path.gate.ai",
										"{date} · final review · verdict by {verdict}",
										{
											date: formatShort(finalSession.scheduledAt),
											verdict: formatShort(
												dayjs
													.utc(finalSession.scheduledAt)
													.add(3, "day")
													.toISOString(),
											),
										},
									)
								: t(
										"workflow.path.gate.human",
										"{date} · call with {name} · verdict by {verdict}",
										{
											date: formatShort(finalSession.scheduledAt),
											name: curatorName,
											verdict: formatShort(
												dayjs
													.utc(finalSession.scheduledAt)
													.add(3, "day")
													.toISOString(),
											),
										},
									)}
						</span>
					)}
					<span className={styles.gateTitle}>
						{t("workflow.path.checkpoint.title", "Checkpoint {number}", {
							number: String(number),
						})}
					</span>
				</div>
			</PathNode>

			{previous && (
				<Modal
					open={modal === "results"}
					onCancel={() => setModal(null)}
					footer={null}
					title={t(
						"workflow.path.results.title",
						"Checkpoint {number} results",
						{
							number: String(previous.number),
						},
					)}
				>
					<div className={styles.result}>
						<CheckpointResult checkpoint={previous.checkpoint} />
					</div>
				</Modal>
			)}

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
	);
}
