"use client";

import {
	IconCalendarPlus,
	IconFileText,
	IconMessageCircle,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import dayjs from "dayjs";
import { CuratorMessage } from "@/components/checkpoints/CuratorReview/CuratorMessage";
import { SESSION_MINUTES } from "@/config/checkpoint";
import { downloadIcs } from "@/lib/calendar";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import { firstName } from "./CallHeader";

export type ClosedStageProps = {
	call: CheckpointCallDto;
	/** This call's notes are written: the panel can open them. */
	notesReady: boolean;
	onChat: () => void;
	chatLoading?: boolean;
	onOpenReview: () => void;
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
}: ClosedStageProps) {
	const { t } = useTranslate();
	const scheduled = dayjs(call.scheduledAt);
	const team = call.role === "team";

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
								"checkpoints.call.overText",
								"The call is over. The plan is below, and the notes from the call will be here within the hour — everyone gets a letter when they're ready.",
							)
				}
				actions={
					notesReady
						? [
								{
									key: "notes",
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

	const addToCalendar = () =>
		downloadIcs(
			{
				uid: `checkpoint-${call.checkpointId}-session-${call.index}@gdhub.io`,
				title: t("checkpoints.call.calendarTitle", "Call {index} · {project}", {
					index: call.index,
					project: call.project.name,
				}),
				start: scheduled.toDate(),
				minutes: SESSION_MINUTES,
				allDay: false,
				url: window.location.href,
			},
			`call-${call.index}.ics`,
		);
	const when = {
		date: scheduled.format("dddd D MMM"),
		time: scheduled.format("HH:mm"),
	};

	return (
		<CuratorMessage
			curator={call.curator}
			date={scheduled.format("D MMM, HH:mm")}
			message={
				team
					? t(
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
					key: "calendar",
					label: t("workflow.path.session.calendar", "Add to calendar"),
					icon: <IconCalendarPlus size={16} />,
					primary: true,
					onClick: addToCalendar,
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
			]}
		/>
	);
}
