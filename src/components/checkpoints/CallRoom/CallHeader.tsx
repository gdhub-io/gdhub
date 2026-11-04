"use client";

import { IconLink, IconMessageCircle, IconPhoneOff } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Popconfirm } from "antd";
import dayjs from "dayjs";
import { type ReactNode, useEffect, useState } from "react";
import { CuratorHeader } from "@/components/checkpoints/CuratorReview/CuratorHeader";
import type { StatusTone } from "@/components/ui";
import { FINAL_SESSION } from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { firstName } from "@/helpers/format";
import type { CheckpointCallDto } from "@/types/checkpoint-call";

export type CallHeaderProps = {
	call: Pick<
		CheckpointCallDto,
		| "index"
		| "number"
		| "stageName"
		| "curator"
		| "scheduledAt"
		| "curatorJoinedAt"
		| "state"
		| "missed"
		| "role"
		| "project"
	>;
	backHref: string;
	joined: boolean;
	onChat: () => void;
	chatLoading?: boolean;
	onCopyLink: () => void;
	/** Shown while in the call. */
	onLeave?: () => void;
	/** The curator's alone: closes the room for everyone. */
	onEnd?: () => void;
	ending?: boolean;
	/** Fixed in stories so "today" stays put. */
	now?: Date;
};

/**
 * "Live · 24:18": how long the call has run since the curator joined, ticking
 * each second on its own so the rest of the header stays still.
 */
function LiveFor({ since }: { since: string }) {
	const { t } = useTranslate();
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);
	const seconds = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
	const pad = (n: number) => String(n).padStart(2, "0");
	const hours = Math.floor(seconds / 3600);
	const clock = `${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
	return t("checkpoints.call.status.liveFor", "Live · {time}", {
		time: hours ? `${hours}:${clock}` : clock,
	});
}

export { firstName };

/** "14:00" today, "8 Oct, 14:00" on any other day. */
export const callTime = (at: string, now = new Date()) => {
	const time = dayjs(at);
	return time.isSame(now, "day")
		? time.format("HH:mm")
		: time.format("D MMM, HH:mm");
};

/** Frame `DjZqC` for pro: who the call is with, what it is for, and the call's own buttons. */
export function CallHeader({
	call,
	backHref,
	joined,
	onChat,
	chatLoading,
	onCopyLink,
	onLeave,
	onEnd,
	ending,
	now = new Date(),
}: CallHeaderProps) {
	const { t } = useTranslate();
	const scheduled = dayjs(call.scheduledAt);

	let purpose: string;
	if (call.index === 1) {
		purpose = t("checkpoints.call.purpose.plan", "Sets the plan");
	} else if (call.index === FINAL_SESSION) {
		purpose = t("checkpoints.call.purpose.final", "The final call");
	} else {
		purpose = t("checkpoints.call.purpose.sprint", "Opens Sprint {n}", {
			n: call.index,
		});
	}

	let status: { tone: StatusTone; label: ReactNode };
	if (call.missed) {
		status = {
			tone: "danger",
			label: t("checkpoints.call.status.missed", "Missed"),
		};
	} else if (call.state === "over") {
		status = {
			tone: "neutral",
			label: t("checkpoints.call.status.over", "Ended"),
		};
	} else if (joined) {
		status = {
			tone: "danger",
			label: call.curatorJoinedAt ? (
				<LiveFor since={call.curatorJoinedAt} />
			) : (
				t("checkpoints.call.status.live", "Live")
			),
		};
	} else {
		status = {
			tone: call.state === "open" ? "warning" : "neutral",
			label: scheduled.isSame(now, "day")
				? t("checkpoints.call.status.startsAt", "Starts at {time}", {
						time: scheduled.format("HH:mm"),
					})
				: t("checkpoints.call.status.startsOn", "Starts {date}", {
						date: callTime(call.scheduledAt, now),
					}),
		};
	}

	return (
		<CuratorHeader
			backHref={backHref}
			number={call.number}
			kind={CheckpointCuratorKind.Human}
			status={status}
			subtitle={t(
				"checkpoints.call.subtitleWith",
				"Call {index} with {name} · {purpose} · Checkpoint {number} · {stage} · {when}",
				{
					index: call.index,
					// The curator talks to the project, the team to the curator.
					name:
						call.role === "curator"
							? call.project.name
							: firstName(call.curator.name),
					purpose,
					number: call.number,
					stage: call.stageName,
					when: scheduled.format("D MMM YYYY, HH:mm"),
				},
			)}
			actions={
				<>
					<Button
						icon={<IconMessageCircle size={16} />}
						loading={chatLoading}
						onClick={onChat}
					>
						{t("checkpoints.call.chat", "Chat")}
					</Button>
					<Button icon={<IconLink size={16} />} onClick={onCopyLink}>
						{t("checkpoints.call.copyLink", "Copy link")}
					</Button>
					{joined && onLeave && (
						<Button danger icon={<IconPhoneOff size={16} />} onClick={onLeave}>
							{t("checkpoints.call.leave", "Leave call")}
						</Button>
					)}
					{joined && onEnd && (
						<Popconfirm
							title={t(
								"checkpoints.call.endConfirm",
								"End the call for everyone?",
							)}
							okText={t("checkpoints.call.endOk", "End call")}
							okButtonProps={{ danger: true }}
							cancelText={t("common.cancel", "Cancel")}
							onConfirm={onEnd}
						>
							<Button danger type="text" loading={ending}>
								{t("checkpoints.call.end", "End call for everyone")}
							</Button>
						</Popconfirm>
					)}
				</>
			}
		/>
	);
}
