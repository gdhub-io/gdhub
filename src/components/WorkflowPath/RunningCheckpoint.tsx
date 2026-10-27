import {
	IconArrowUpRight,
	IconCalendarPlus,
	IconChevronDown,
	IconChevronRight,
	IconChevronUp,
	IconCircleCheck,
	IconDotsVertical,
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
import { Button, Dropdown, Flex, Modal, Tooltip, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { AttachEvidenceModal } from "@/components/checkpoints/AttachEvidenceModal";
import { dayRange } from "@/components/checkpoints/CheckpointCard/SprintTrack";
import CreateArtifactModal from "@/components/modals/CreateArtifactModal";
import { SectionHeading, StatusDot } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { AI_CURATOR_AVATAR, SESSION_MINUTES } from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
} from "@/config/prisma-enums";
import { useMarkVerdictRead } from "@/hooks/checkpoints";
import { downloadIcs } from "@/lib/calendar";
import { callMissed, sessionHeld } from "@/lib/checkpoint-call";
import {
	type ChecklistItem,
	type ChecklistKey,
	sprintChecklist,
} from "@/lib/checkpoint-checklist";
import { dateOfDay, VERDICT_DAY } from "@/lib/checkpoint-plan";
import type {
	CheckpointDto,
	CheckpointSessionDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";
import { ArtifactLink } from "./ArtifactLink";
import { CheckpointResult } from "./ClosedCheckpoint";
import { daysUntil, formatShort } from "./dates";
import { PathNode } from "./PathNode";
import { PulseChip } from "./PulseChip";
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
	/** "You are here", when a sprint behind pushes it down to the current one. */
	here: ReactNode;
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
	here,
}: RunningCheckpointProps) {
	const { t } = useTranslate();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [modal, setModal] = useState<
		"results" | "build" | "devlog" | "artifacts" | null
	>(null);
	const markRead = useMarkVerdictRead(checkpoint.id);
	const [opened, setOpened] = useState<number[]>([]);

	const sprints = checkpoint.sprints ?? [];
	const sessions = checkpoint.sessions ?? [];
	const current =
		sprints.find((sprint) => sprint.state === "current") ?? sprints.at(-1);
	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const curatorName = checkpoint.curator?.name?.split(" ")[0] ?? "";
	const sessionWith = t("workflow.path.session.with", "Session with {name}", {
		name: curatorName,
	});
	const number = checkpoint.number ?? 1;
	const base = `/user/project/${project.slug}/workflow/cp${number}`;
	const sessionHref = (session: CheckpointSessionDto) =>
		`${base}/review/${session.index}`;

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

	const itemLabel = (item: ChecklistItem) =>
		({
			verdict: t(
				"workflow.path.check.verdict",
				"Read the Checkpoint {number} verdict",
				{ number: String(previous?.number) },
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

	/** The line's date on the right; today's is marked, a missed one is red. */
	const itemDue = (item: ChecklistItem) => {
		if (!item.dueAt) return null;
		const days = daysUntil(item.dueAt);
		const date = formatShort(item.dueAt);
		if (item.done) return <span className={styles.tertiary}>{date}</span>;
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
		if (key === "priorities" && openingSession) {
			router.push(sessionHref(openingSession));
			return;
		}
		if (key === "build" || key === "devlog" || key === "artifacts")
			setModal(key);
	};

	const checklistRow = (item: ChecklistItem) => {
		// The priorities are set in the call: the line opens it, as Join session does.
		const actionable =
			item.key === "priorities"
				? !!openingSession
				: canManage && !item.done && item.key !== "verdict";
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

	const who = (
		<span className={styles.chip}>
			{isAI ? (
				<span className={styles.chipIcon}>
					<IconSparkles size={14} />
				</span>
			) : (
				<AppAvatar src={checkpoint.curator?.image} size={20}>
					{curatorName[0]}
				</AppAvatar>
			)}
			{isAI ? t("workflow.path.ai-curator", "AI curator") : curatorName}
		</span>
	);

	// The AI's first session is the start, where the tasks are set: open from day 1.
	const reviewTitle = (session: CheckpointSessionDto) =>
		session.index === 1
			? t("workflow.path.session.ai-start", "Set the tasks")
			: t("workflow.path.session.review-title", "Sprint {number} review", {
					number: String(session.index - 1),
				});
	const held = (session: CheckpointSessionDto) =>
		sessionHeld(session, checkpoint.curatorKind);
	/** A call or review already behind: one line, linking to its notes. */
	const sessionDone = (session: CheckpointSessionDto) => (
		<div className={styles.sessionDone}>
			{isAI ? <IconSparkles size={16} /> : <IconVideo size={16} />}
			<span>{isAI ? reviewTitle(session) : sessionWith}</span>
			<span className={`${styles.meta} ${styles.grow}`}>
				{formatShort(session.scheduledAt)}
			</span>
			{!isAI && callMissed(session) ? (
				<Typography.Text type="danger">
					{t("workflow.path.session.missed", "{name} didn't join", {
						name: curatorName,
					})}
				</Typography.Text>
			) : (
				<Link href={sessionHref(session)} className={styles.link}>
					{isAI
						? t("workflow.path.session.review", "Review")
						: t("workflow.path.session.notes", "Notes")}
					<IconArrowUpRight size={14} />
				</Link>
			)}
		</div>
	);

	const stat = (icon: ReactNode, count: number, title: string) => (
		<Tooltip title={title}>
			<span className={styles.stat}>
				{icon}
				{count}
			</span>
		</Tooltip>
	);
	const section = (label: string, rows: ReactNode) => (
		<div className={styles.block}>
			<span className={styles.sectionLabel}>{label}</span>
			{rows}
		</div>
	);

	const doneSprint = (sprint: CheckpointSprintDto) => {
		const devlog = checkpoint.reports?.find(
			(report) => report.sprint === sprint.number,
		);
		// Only what this sprint itself added: a share of the checkpoint's total
		// would need a per-sprint target nobody set.
		const evidence = (checkpoint.evidence ?? []).filter(
			(item) => item.sprint === sprint.number,
		);
		const added = new Set([
			...evidence.map((item) => item.artifact.id),
			...(checkpoint.builds ?? [])
				.filter((build) => build.sprint === sprint.number)
				.map((build) => build.id),
		]).size;
		const open = opened.includes(sprint.number);
		const session = sessions.find(
			(item) => item.index === sprint.number && held(item),
		);
		const proofOf = new Map(
			evidence.flatMap((item) =>
				item.itemIds.map((id) => [id, item.artifact] as const),
			),
		);
		const closed = proofOf.size;
		const tasks = checkpoint.items.filter((item) => proofOf.has(item.id));
		// What the sprint added beyond the proof of a closed task.
		const others = [
			...new Map(
				evidence
					.filter((item) => item.itemIds.length === 0)
					.map((item) => [item.artifact.id, item.artifact]),
			).values(),
		];

		const toggle = () =>
			setOpened((list) =>
				open
					? list.filter((item) => item !== sprint.number)
					: [...list, sprint.number],
			);

		return (
			<PathNode key={sprint.number} marker="done">
				{/* biome-ignore lint/a11y/noStaticElementInteractions: folded, the whole card opens it; open, the head folds it back; the chevron is the keyboard control */}
				<div
					className={
						open ? styles.summary : `${styles.summary} ${styles.summaryFolded}`
					}
					onClick={open ? undefined : toggle}
				>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: see the card above */}
					<div
						className={styles.summaryHead}
						onClick={open ? toggle : undefined}
					>
						<span className={styles.summaryTitle}>
							{t("workflow.path.sprint.name", "Sprint {number}", {
								number: String(sprint.number),
							})}
							<span className={styles.summaryDates}>
								{dayRange(sprint.from, sprint.to)}
							</span>
						</span>
						<div className={styles.summaryMeta}>
							{devlog &&
								stat(
									<IconNotebook size={14} />,
									1,
									t("workflow.path.sprint.devlog", "Devlog"),
								)}
							{added > 0 &&
								stat(
									<IconLayoutGridAdd size={14} />,
									added,
									t(
										"workflow.path.sprint.added",
										"{count, plural, one {# artifact added} other {# artifacts added}}",
										{ count: added },
									),
								)}
							{closed > 0 &&
								stat(
									<IconCircleCheck size={14} />,
									closed,
									t(
										"workflow.path.sprint.closedThis",
										"{count, plural, one {# task closed this sprint} other {# tasks closed this sprint}}",
										{ count: closed },
									),
								)}
							{/* biome-ignore lint/a11y/noStaticElementInteractions: only keeps the pulse's click from folding the sprint */}
							<span onClick={(event) => event.stopPropagation()}>
								<PulseChip
									rows={checkpoint.pulses ?? []}
									sprint={sprint}
									day={checkpoint.day}
									still
								/>
							</span>
							<Button
								type="text"
								size="small"
								aria-expanded={open}
								aria-label={t("workflow.path.sprint.details", "Sprint details")}
								icon={
									open ? (
										<IconChevronUp size={16} />
									) : (
										<IconChevronDown size={16} />
									)
								}
								onClick={(event) => {
									event.stopPropagation();
									toggle();
								}}
							/>
						</div>
					</div>

					{open && (
						<>
							{session && sessionDone(session)}
							{tasks.length > 0 &&
								section(
									t("workflow.path.sprint.tasksClosed", "Tasks closed"),
									tasks.map((item) => {
										const proof = proofOf.get(item.id);
										return (
											<div key={item.id} className={styles.outcome}>
												<IconCircleCheck
													size={16}
													className={styles.taskIconDone}
												/>
												<span className={styles.grow}>{item.text}</span>
												{proof && <ArtifactLink artifact={proof} />}
											</div>
										);
									}),
								)}
							{others.length > 0 &&
								section(
									t("workflow.path.sprint.artifactsAdded", "Artifacts added"),
									others.map((artifact) => (
										<Typography.Link
											key={artifact.id}
											href={artifact.link}
											target="_blank"
											rel="noreferrer"
											className={styles.link}
										>
											<IconLayoutGridAdd size={16} />
											{artifact.name ?? artifact.link}
											<IconArrowUpRight size={14} />
										</Typography.Link>
									)),
								)}
							{devlog && (
								<Link href={`/devlog/${devlog.id}`} className={styles.link}>
									<IconNotebook size={16} />
									{t(
										"workflow.path.sprint.devlogOf",
										"Sprint {number} devlog",
										{
											number: String(sprint.number),
										},
									)}
									<IconArrowUpRight size={14} />
								</Link>
							)}
							{!session &&
								!devlog &&
								others.length === 0 &&
								tasks.length === 0 && (
									<span className={styles.secondary}>
										{t(
											"workflow.path.sprint.empty",
											"Nothing was added in this sprint.",
										)}
									</span>
								)}
						</>
					)}
				</div>
			</PathNode>
		);
	};

	const addToCalendar = (session: CheckpointSessionDto) =>
		downloadIcs(
			{
				uid: `checkpoint-${checkpoint.id}-session-${session.index}@gdhub.io`,
				title: `${sessionWith} · ${project.name}`,
				start: new Date(session.scheduledAt),
				minutes: SESSION_MINUTES,
				allDay: !session.timeKnown,
				url: `${window.location.origin}/user/project/${project.slug}/workflow`,
			},
			`session-${session.index}.ics`,
		);

	/** One call or review: in its own stop on the line, or heading the sprint card on its day. */
	const sessionBody = (session: CheckpointSessionDto, today = false) => {
		const days = daysUntil(session.scheduledAt);
		const when = dayjs.utc(session.scheduledAt);
		// A known hour is a moment, read in the viewer's zone; a bare day is a
		// UTC midnight and stays one.
		const start = dayjs(session.scheduledAt);
		const hours = `${start.format("HH:mm")} – ${start.add(SESSION_MINUTES, "minute").format("HH:mm")}`;
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
					size="large"
					icon={<IconFileText size={16} />}
					disabled={!ready && session.index !== 1}
					onClick={() => router.push(sessionHref(session))}
				>
					{session.index === 1
						? t("workflow.path.session.open-plan", "Open the plan")
						: t("workflow.path.session.open-review", "Open review")}
				</Button>
			);
		} else if (days > 0) {
			action = (
				<Button size="large" disabled icon={<IconLock size={16} />}>
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
					size="large"
					icon={<IconVideo size={16} />}
					onClick={() => router.push(sessionHref(session))}
				>
					{t("workflow.path.session.join", "Join session")}
				</Button>
			);
		}

		return (
			<div className={today ? styles.sessionToday : styles.session}>
				<div className={styles.sessionWho}>
					{isAI ? (
						<AppAvatar
							src={checkpoint.character?.avatar ?? AI_CURATOR_AVATAR}
							size={56}
						/>
					) : (
						<AppAvatar src={checkpoint.curator?.image} size={56}>
							{curatorName[0]}
						</AppAvatar>
					)}
					<div className={styles.sessionText}>
						<span>
							{days === 0
								? t("workflow.path.session.today-label", "Today")
								: when.format("MMMM D")}
						</span>
						<span className={styles.sessionWhen}>
							{isAI
								? reviewTitle(session)
								: session.timeKnown
									? `${start.format("dddd")} · ${hours}`
									: when.format("dddd")}
						</span>
						<span>
							{isAI
								? session.index === 1
									? t(
											"workflow.path.session.ai-start-sub",
											"The AI curator reads your tasks and says which fit the four weeks",
										)
									: t(
											"workflow.path.session.review-sub",
											"Written by the AI curator from your devlog, artifacts and activity",
										)
								: today
									? sessionWith
									: `${sessionWith} · ${opens}`}
						</span>
					</div>
				</div>
				{isAI ? (
					action
				) : (
					<Flex gap="small" align="center">
						{action}
						{/* Frame 07.3. Rescheduling waits for stored session times (GDHUB-70). */}
						<Dropdown
							trigger={["click"]}
							placement="bottomRight"
							menu={{
								items: [
									{
										key: "calendar",
										icon: <IconCalendarPlus size={16} />,
										label: t(
											"workflow.path.session.calendar",
											"Add to calendar",
										),
										onClick: () => addToCalendar(session),
									},
								],
							}}
						>
							<Button
								size="large"
								type="text"
								icon={<IconDotsVertical size={20} />}
								aria-label={t("workflow.path.session.more", "Session actions")}
							/>
						</Dropdown>
					</Flex>
				)}
			</div>
		);
	};

	const sessionCard = (session: CheckpointSessionDto) => (
		<PathNode
			key={`session-${session.index}`}
			marker={isAI ? "review" : "session"}
		>
			{sessionBody(session)}
		</PathNode>
	);

	// The call that opens this sprint is due and has not happened: it is the
	// one thing to do today, so it heads the sprint card (frame 08).
	const sessionToday =
		!isAI &&
		openingSession &&
		!held(openingSession) &&
		daysUntil(openingSession.scheduledAt) <= 0
			? openingSession
			: null;

	const nextLabel = nextSession
		? t(
				"workflow.path.check.head-sprint",
				"By the end of Sprint {number} · {date}",
				{
					number: String(current.number),
					date: formatShort(current.to),
				},
			)
		: t("workflow.path.check.head-final", "Before the checkpoint");
	const ahead = sprints.filter((sprint) => sprint.state === "ahead");
	const gateDates = finalSession &&
		checkpoint.startedAt && {
			date: formatShort(finalSession.scheduledAt),
			verdict: formatShort(
				dateOfDay(checkpoint.startedAt, VERDICT_DAY).toISOString(),
			),
		};

	return (
		<>
			{sprints.filter((sprint) => sprint.state === "done").map(doneSprint)}

			<PathNode marker="current" offset={here ? 64 : undefined}>
				{here && <div className={styles.hereAbove}>{here}</div>}
				<div className={styles.sprint}>
					<div className={styles.sprintHead}>
						<span className={styles.sprintTitle}>
							{t("workflow.path.sprint.name", "Sprint {number}", {
								number: String(current.number),
							})}
						</span>
						<span className={styles.sprintMeta}>
							{dayRange(current.from, current.to)}
							<PulseChip
								rows={checkpoint.pulses ?? []}
								sprint={current}
								day={checkpoint.day}
							/>
						</span>
					</div>

					{sessionToday && sessionBody(sessionToday, true)}

					{openingSession &&
						held(openingSession) &&
						sessionDone(openingSession)}

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

			{!sessionToday &&
				nextSession &&
				nextSession.index <= 4 &&
				// A call moved before its sprint and let pass is behind, not ahead.
				(!isAI && held(nextSession) ? (
					<PathNode marker="session">{sessionDone(nextSession)}</PathNode>
				) : (
					sessionCard(nextSession)
				))}

			{ahead.length > 0 && (
				<PathNode marker="none">
					<SectionHeading
						level={3}
						title={t("workflow.path.up-next", "Up next")}
						className={styles.upNextTitle}
					/>
				</PathNode>
			)}
			{ahead.map((sprint) => {
				const days = daysUntil(sprint.from);
				return (
					<PathNode key={sprint.number} marker="sprint">
						<div className={styles.futureSprint}>
							<span className={styles.futureDates}>
								{dayRange(sprint.from, sprint.to)}
								{days > 0 &&
									` · ${
										days === 1
											? t("workflow.path.starts-tomorrow", "starts tomorrow")
											: t("workflow.path.starts-in", "starts in {days} days", {
													days: String(days),
												})
									}`}
							</span>
							<div className={styles.futureLine}>
								<span className={styles.futureTitle}>
									{t("workflow.path.sprint.name", "Sprint {number}", {
										number: String(sprint.number),
									})}
								</span>
								<span className={styles.with}>
									{isAI
										? t("workflow.path.review-by", "review by")
										: t("workflow.path.with", "with")}
									{who}
								</span>
							</div>
						</div>
					</PathNode>
				);
			})}

			<PathNode marker="gate" rail="dashed">
				<div className={styles.gate}>
					{gateDates && (
						<span className={styles.meta}>
							{isAI
								? t(
										"workflow.path.gate.ai",
										"{date} · final review · verdict by {verdict}",
										gateDates,
									)
								: t(
										"workflow.path.gate.human",
										"{date} · call with {name} · verdict by {verdict}",
										{ ...gateDates, name: curatorName },
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
