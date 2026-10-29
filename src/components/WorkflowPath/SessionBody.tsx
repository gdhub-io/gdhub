import {
	IconCalendarPlus,
	IconCalendarTime,
	IconDotsVertical,
	IconFileText,
	IconLock,
	IconVideo,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Dropdown, Flex } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { useCalendarMenu } from "@/components/checkpoints/AddToCalendar";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { AI_CURATOR_AVATAR, SESSION_MINUTES } from "@/config/checkpoint";
import { CheckpointSessionContentStatus } from "@/config/prisma-enums";
import { isMovable } from "@/lib/checkpoints/call";
import type { CheckpointDto, CheckpointSessionDto } from "@/types/checkpoints";
import { daysUntil } from "./dates";
import styles from "./style.module.scss";

/** One call or review: in its own stop on the line, or heading the sprint card on its day. */

export function SessionBody({
	session,
	today = false,
	checkpoint,
	isAI,
	curatorName,
	sessionWith,
	canManage,
	sessionHref,
	reviewTitle,
	setMoving,
	calendarItems,
}: {
	session: CheckpointSessionDto;
	today?: boolean;
	checkpoint: CheckpointDto;
	isAI: boolean;
	curatorName: string;
	sessionWith: string;
	canManage: boolean;
	sessionHref: (session: CheckpointSessionDto) => string;
	reviewTitle: (session: CheckpointSessionDto) => string;
	setMoving: (index: number) => void;
	calendarItems: (
		session: CheckpointSessionDto,
	) => ReturnType<ReturnType<typeof useCalendarMenu>>;
}) {
	const { t } = useTranslate();
	const router = useRouter();

	const days = daysUntil(session.scheduledAt);
	const when = dayjs.utc(session.scheduledAt);
	// A known hour is a moment, read in the viewer's zone; a bare day is a
	// UTC midnight and stays one.
	const start = dayjs(session.scheduledAt);
	const hours = `${start.format("HH:mm")} – ${start.add(SESSION_MINUTES, "minute").format("HH:mm")}`;
	const ready = session.contentStatus === CheckpointSessionContentStatus.Ready;
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
					{/* Frame 07.3. */}
					<Dropdown
						trigger={["click"]}
						placement="bottomRight"
						menu={{
							items: [
								// The server's rule; it checks again who is asking.
								...(canManage &&
								session.timeKnown &&
								isMovable(
									{
										scheduledAt: new Date(session.scheduledAt),
										endedAt: session.endedAt ? new Date(session.endedAt) : null,
									},
									checkpoint,
									new Date(),
								)
									? [
											{
												key: "move",
												icon: <IconCalendarTime size={16} />,
												label: t("checkpoints.move.open", "Move the call"),
												extra: t(
													"checkpoints.move.window",
													"Days 1–3 of the sprint",
												),
												onClick: () => setMoving(session.index),
											},
										]
									: []),
								{
									key: "calendar",
									icon: <IconCalendarPlus size={16} />,
									label: t("workflow.path.session.calendar", "Add to calendar"),
									children: calendarItems(session),
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
}
