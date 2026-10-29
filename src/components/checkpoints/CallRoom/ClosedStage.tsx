"use client";

import {
	IconCalendarPlus,
	IconCalendarTime,
	IconFileText,
	IconLock,
	IconMessageCircle,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useCalendarMenu } from "@/components/checkpoints/AddToCalendar";
import { CuratorMessage } from "@/components/checkpoints/CuratorReview/CuratorMessage";
import { SESSION_MINUTES } from "@/config/checkpoint";
import { callWindow } from "@/lib/checkpoints/call";
import type { CheckpointCallDto } from "@/types/checkpoint-call";
import { firstName } from "./CallHeader";
import { MoveCallModal } from "./MoveCallModal";
import { MoveNotice } from "./MoveNotice";

export type ClosedStageProps = {
	call: CheckpointCallDto;
	/** This call's notes are written: the panel can open them. */
	notesReady: boolean;
	onChat: () => void;
	chatLoading?: boolean;
	onOpenReview: () => void;
	/** Fixed in stories so the countdown stays put. */
	now?: Date;
};

/**
 * A call's join button before its room opens: the day and hour while it is a
 * day or more away, then how long is left, ticking by the minute.
 */
export const useLockedJoinLabel = () => {
	const { t } = useTranslate();
	const [, tick] = useState(0);
	useEffect(() => {
		const timer = setInterval(() => tick((n) => n + 1), 60_000);
		return () => clearInterval(timer);
	}, []);
	return (scheduledAt: string | Date, now: Date) => {
		const opensIn = dayjs(callWindow(new Date(scheduledAt)).opensAt).diff(
			now,
			"minute",
		);
		if (opensIn >= 24 * 60)
			return t("checkpoints.call.joinOn", "Join on {date}", {
				date: dayjs(scheduledAt).format("D MMM, HH:mm"),
			});
		if (opensIn >= 60)
			return t("checkpoints.call.joinInHoursMinutes", "Join in {h} h {m} min", {
				h: Math.floor(opensIn / 60),
				m: opensIn % 60,
			});
		return t("checkpoints.call.joinInMinutes", "Join in {n} min", {
			n: Math.max(opensIn, 1),
		});
	};
};

/**
 * 08.9 and 08.8: the curator's panel stands where the video will be, and was —
 * the call ahead with a way into the calendar, or over with its review.
 */
export function ClosedStage({
	call,
	notesReady,
	onChat,
	chatLoading,
	onOpenReview,
	now = new Date(),
}: ClosedStageProps) {
	const { t } = useTranslate();
	const lockedJoin = useLockedJoinLabel();
	const scheduled = dayjs(call.scheduledAt);
	const team = call.role === "team";
	const [moving, setMoving] = useState(false);
	const calendarMenu = useCalendarMenu();
	// Who answers a request: the curator to the team, the team to the curator.
	const otherSide = team
		? firstName(call.curator.name)
		: t("checkpoints.move.theTeam", "the team");

	if (call.missed) {
		const next = call.sessions.find(
			(session) => !session.held && session.index > call.index,
		);
		const at = next && dayjs(next.scheduledAt);
		const nextWhen = at && {
			date: at.format("dddd D MMM"),
			time: at.format("HH:mm"),
		};
		const name = firstName(call.curator.name);
		return (
			<CuratorMessage
				curator={call.curator}
				date={scheduled.format("D MMM")}
				message={
					team
						? nextWhen
							? t(
									"checkpoints.call.missedTeamNext",
									"{name} didn't join this call. The next one is on {date} at {time}.",
									{ name, ...nextWhen },
								)
							: t(
									"checkpoints.call.missedTeam",
									"{name} didn't join this call.",
									{
										name,
									},
								)
						: nextWhen
							? t(
									"checkpoints.call.missedCuratorNext",
									"You didn't join this call. The next one is on {date} at {time}.",
									nextWhen,
								)
							: t(
									"checkpoints.call.missedCurator",
									"You didn't join this call.",
								)
				}
			/>
		);
	}

	if (call.state !== "early") {
		return (
			<CuratorMessage
				curator={call.curator}
				date={scheduled.format("D MMM")}
				message={
					notesReady
						? t(
								"checkpoints.call.overReadyReview",
								"The call is over. The plan and the review of it are below.",
							)
						: t(
								"checkpoints.call.overSoon",
								"The call is over. The plan is below, and the review of the call will be here within two hours — everyone gets a letter when it's ready.",
							)
				}
				actions={
					notesReady
						? [
								{
									key: "review",
									label: t("checkpoints.call.openReview", "Open the review"),
									icon: <IconFileText size={16} />,
									primary: true,
									onClick: onOpenReview,
								},
							]
						: []
				}
			/>
		);
	}

	const calendarEvent = {
		uid: `checkpoint-${call.checkpointId}-session-${call.index}@gdhub.io`,
		title: t("checkpoints.call.calendarTitle", "Call {index} · {project}", {
			index: call.index,
			project: call.project.name,
		}),
		start: scheduled.toDate(),
		minutes: SESSION_MINUTES,
		url: window.location.href,
	};
	const when = {
		date: scheduled.format("dddd D MMM"),
		time: scheduled.format("HH:mm"),
	};

	// Locked until the room opens; the page asks again while it waits.
	const joinLabel = lockedJoin(call.scheduledAt, now);

	return (
		<>
			<CuratorMessage
				curator={call.curator}
				date={scheduled.format("D MMM, HH:mm")}
				extra={<MoveNotice call={call} otherSide={otherSide} />}
				message={
					team
						? call.index === 1
							? t(
									"checkpoints.call.aheadFirst",
									"Hi, team! I'm {name}, the curator of {project} for the next 28 days. Our first call is on {date} at {time} — we'll agree the plan together. The room opens 15 minutes before; you'll be let in as soon as I join.",
									{
										name: firstName(call.curator.name),
										project: call.project.name,
										...when,
									},
								)
							: t(
									"checkpoints.call.aheadTeam",
									"Our call is on {date} at {time}. The room opens 15 minutes before; you'll be let in as soon as I join.",
									when,
								)
						: t(
								"checkpoints.call.aheadCurator",
								"The call with {project} is on {date} at {time}. The room opens 15 minutes before; the team gets in once you join.",
								{ project: call.project.name, ...when },
							)
				}
				actions={[
					{
						key: "join",
						label: joinLabel,
						icon: <IconLock size={16} />,
						primary: true,
						disabled: true,
					},
					{
						key: "calendar",
						label: t("workflow.path.session.calendar", "Add to calendar"),
						icon: <IconCalendarPlus size={16} />,
						menu: calendarMenu(calendarEvent, `call-${call.index}.ics`),
					},
					...(team
						? [
								{
									key: "chat",
									label: t("checkpoints.call.message", "Message {name}", {
										name: firstName(call.curator.name),
									}),
									icon: <IconMessageCircle size={16} />,
									loading: chatLoading,
									onClick: onChat,
								},
							]
						: []),
					...(call.canMove && !call.move
						? [
								{
									key: "move",
									label: t("checkpoints.move.open", "Move the call"),
									icon: <IconCalendarTime size={16} />,
									onClick: () => setMoving(true),
								},
							]
						: []),
				]}
			/>
			{call.canMove && (
				<MoveCallModal
					checkpointId={call.checkpointId}
					index={call.index}
					otherSide={otherSide}
					curatorName={firstName(call.curator.name)}
					open={moving}
					onClose={() => setMoving(false)}
				/>
			)}
		</>
	);
}
