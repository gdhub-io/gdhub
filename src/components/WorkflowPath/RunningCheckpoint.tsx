import { IconArrowUpRight, IconSparkles, IconVideo } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { useCalendarMenu } from "@/components/checkpoints/AddToCalendar";
import { MoveCallModal } from "@/components/checkpoints/CallRoom/MoveCallModal";
import { dayRange } from "@/components/checkpoints/CheckpointCard/SprintTrack";
import { SectionHeading } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { SESSION_MINUTES } from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { sessionHeld } from "@/lib/checkpoints/call";
import { checkpointPathHref } from "@/lib/checkpoints/hrefs";
import { dateOfDay, VERDICT_DAY } from "@/lib/checkpoints/plan";
import type {
	CheckpointDto,
	CheckpointSessionDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";
import { DoneSprint } from "./DoneSprint";
import { daysUntil, formatShort } from "./dates";
import { PathNode } from "./PathNode";
import { PulseChip } from "./PulseChip";
import { SessionBody } from "./SessionBody";
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

	const [opened, setOpened] = useState<number[]>([]);
	// The call whose move modal is open (12.08.11).
	const [moving, setMoving] = useState<number | null>(null);
	const calendarMenu = useCalendarMenu();

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
	const sessionHref = (session: CheckpointSessionDto) =>
		checkpointPathHref(project.slug, number, session.index);

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

	const doneSprint = (sprint: CheckpointSprintDto) => (
		<DoneSprint
			key={sprint.number}
			sprint={sprint}
			checkpoint={checkpoint}
			sessions={sessions}
			opened={opened}
			setOpened={setOpened}
			held={held}
			sessionDone={sessionDone}
		/>
	);

	const calendarItems = (session: CheckpointSessionDto) =>
		calendarMenu(
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

	const sessionBody = (session: CheckpointSessionDto, today = false) => (
		<SessionBody
			session={session}
			today={today}
			checkpoint={checkpoint}
			isAI={isAI}
			curatorName={curatorName}
			sessionWith={sessionWith}
			canManage={canManage}
			sessionHref={sessionHref}
			reviewTitle={reviewTitle}
			setMoving={setMoving}
			calendarItems={calendarItems}
		/>
	);

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
			{moving !== null && (
				<MoveCallModal
					checkpointId={checkpoint.id}
					index={moving}
					otherSide={curatorName}
					curatorName={curatorName}
					open
					onClose={() => setMoving(null)}
				/>
			)}
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
