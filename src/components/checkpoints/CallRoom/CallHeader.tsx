"use client";

import {
	IconChevronLeft,
	IconLink,
	IconMessageCircle,
	IconPhoneOff,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Popconfirm, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { StatusDot, type StatusTone } from "@/components/ui";
import { FINAL_SESSION } from "@/config/checkpoint";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import styles from "./style.module.scss";

export type CallHeaderProps = {
	call: Pick<
		CheckpointCallDto,
		| "index"
		| "number"
		| "stageName"
		| "curator"
		| "scheduledAt"
		| "state"
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

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** "14:00" today, "8 Oct, 14:00" on any other day. */
export const callTime = (at: string, now = new Date()) => {
	const time = dayjs(at);
	return time.isSame(now, "day")
		? time.format("HH:mm")
		: time.format("D MMM, HH:mm");
};

/** Frame `DjZqC`: the way back, who the call is with, and what it is for. */
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

	let status: { tone: StatusTone; label: string };
	if (call.state === "over") {
		status = {
			tone: "neutral",
			label: t("checkpoints.call.status.over", "Ended"),
		};
	} else if (joined) {
		status = {
			tone: "danger",
			label: t("checkpoints.call.status.live", "Live"),
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
		<div className={styles.header}>
			<div className={styles.headerLead}>
				<Link href={backHref}>
					<Button
						type="text"
						aria-label={t("common.back", "Back")}
						icon={<IconChevronLeft size={20} />}
					/>
				</Link>
				<div className={styles.titles}>
					<div className={styles.titleRow}>
						<Typography.Title level={2} className={styles.title}>
							{t("checkpoints.call.title", "Call with {name}", {
								// The curator talks to the project, the team to the curator.
								name:
									call.role === "curator"
										? call.project.name
										: firstName(call.curator.name),
							})}
						</Typography.Title>
						<StatusDot tone={status.tone} label={status.label} />
					</div>
					<Typography.Text className={styles.subtitle}>
						{t(
							"checkpoints.call.subtitle",
							"{purpose} · Checkpoint {number} · {stage} · {when}",
							{
								purpose,
								number: call.number,
								stage: call.stageName,
								when: scheduled.format("D MMM YYYY, HH:mm"),
							},
						)}
					</Typography.Text>
				</div>
			</div>

			<Flex gap={8} align="center" wrap>
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
			</Flex>
		</div>
	);
}
