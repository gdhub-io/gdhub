import {
	IconArrowUpRight,
	IconCalendarPlus,
	IconChevronDown,
	IconChevronUp,
	IconCircleCheck,
	IconDotsVertical,
	IconFileText,
	IconLayoutGridAdd,
	IconLock,
	IconNotebook,
	IconSparkles,
	IconVideo,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Dropdown, Flex, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { dayRange } from "@/components/checkpoints/CheckpointCard/SprintTrack";
import { SectionHeading } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { AI_CURATOR_AVATAR, SESSION_MINUTES } from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
} from "@/config/prisma-enums";
import { downloadIcs } from "@/lib/calendar";
import { sessionHeld } from "@/lib/checkpoint-call";
import { dateOfDay, VERDICT_DAY } from "@/lib/checkpoint-plan";
import type {
	CheckpointDto,
	CheckpointSessionDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";
import { ArtifactLink } from "./ArtifactLink";
import { daysUntil, formatShort } from "./dates";
import { PathNode } from "./PathNode";
import { PulseChip } from "./PulseChip";
import { SprintChecklist } from "./SprintChecklist";
import styles from "./style.module.scss";

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
	const _queryClient = useQueryClient();
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

	if (!current) return null;

	const nextSession = sessions.find(
		(session) => session.index === current.number + 1,
	);
	const openingSession = sessions.find(
		(session) => session.index === current.number,
	);
	const finalSession = sessions.at(-1);

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
			{session.missed ? (
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

					<SprintChecklist
						checkpoint={checkpoint}
						sprint={current}
						project={project}
						previous={previous}
						canManage={canManage}
						head={nextLabel}
					/>
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
		</>
	);
}
