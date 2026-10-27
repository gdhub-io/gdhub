"use client";

import {
	IconFileText,
	IconMessageCircle,
	IconVideo,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import type { ReactNode } from "react";
import { InverseBand } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { AI_CURATOR_AVATAR, AI_CURATOR_NAME } from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
} from "@/config/prisma-enums";
import { callState } from "@/lib/checkpoint-call";
import type { CheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

const { Text, Paragraph } = Typography;

type Action = { key: string; label: string; icon: ReactNode; href: string };

/**
 * Frames 12.07, 12.08 and 12.10 (`xZ32D`, `BixZr`, `ErNgO`): the curator on
 * top of the checkpoint widget — what they said last, and the one thing it
 * asks for; a pro curator's call one click away below it.
 */
export function CuratorNote({
	checkpoint,
	reviewHref,
	onChat,
	chatLoading,
	now = new Date(),
}: {
	checkpoint: CheckpointDto;
	/** The Curator's Review page of one session. */
	reviewHref: (index: number) => string;
	onChat: () => void;
	chatLoading: boolean;
	now?: Date;
}) {
	const { t } = useTranslate();
	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const { curator } = checkpoint;

	let date: string | null = null;
	let message: string;
	let action: Action | null = null;
	let join: (Action & { primary: boolean }) | null = null;

	if (isAI) {
		const { letter } = checkpoint;
		const index = letter?.index ?? 1;
		date = letter ? dayjs(letter.at).format("D MMM") : null;
		message =
			letter?.text ??
			t(
				"workflow.aside.letterSoon",
				"Your AI curator is reading the goal. The first letter will be here in a minute.",
			);
		// Day 1 asks for the tasks until the plan is approved.
		const planOpen = index === 1 && !checkpoint.goalAgreedAt;
		action = {
			key: "review",
			label: planOpen
				? t("workflow.aside.setTasks", "Set the tasks")
				: t("workflow.aside.readReview", "Read the review"),
			icon: <IconFileText size={16} />,
			href: reviewHref(index),
		};
	} else {
		const sessions = (checkpoint.sessions ?? []).map((session) => ({
			...session,
			state: callState(
				new Date(session.scheduledAt),
				session.endedAt ? new Date(session.endedAt) : null,
				now,
			),
		}));
		const live = sessions.find((session) => session.state === "open");
		const next = sessions.find((session) => session.state === "early");
		const over = sessions.filter((session) => session.state === "over");
		const held = over.at(-1);
		// The latest call whose review is written: what "Open the review" opens.
		const reviewed = over
			.filter(
				(session) =>
					session.contentStatus === CheckpointSessionContentStatus.Ready,
			)
			.at(-1);
		const call = live ?? next;
		const notesReady = !!reviewed && reviewed.index === held?.index;

		if (live) {
			date = t("workflow.aside.today", "today");
			message = t(
				"workflow.aside.callLive",
				"Our call is on now — the room is open, come in.",
			);
		} else if (next) {
			const at = dayjs(next.scheduledAt);
			date = at.format("D MMM");
			message = next.timeKnown
				? t(
						"checkpoints.call.aheadTeam",
						"Our call is on {date} at {time}. The room opens 15 minutes before; you'll be let in as soon as I join.",
						{ date: at.format("dddd D MMM"), time: at.format("HH:mm") },
					)
				: t("workflow.aside.callDay", "Our next call is on {date}.", {
						date: at.format("dddd D MMM"),
					});
		} else {
			date = held ? dayjs(held.scheduledAt).format("D MMM") : null;
			message = notesReady
				? t(
						"checkpoints.call.overReadyReview",
						"The call is over. The plan and the review of it are below.",
					)
				: t(
						"workflow.aside.callsDone",
						"Our calls are behind us. The verdict comes after the last one.",
					);
		}
		if (reviewed && !live) {
			action = {
				key: "review",
				label: t("checkpoints.call.openReview", "Open the review"),
				icon: <IconFileText size={16} />,
				href: reviewHref(reviewed.index),
			};
		}
		if (call) {
			join = {
				key: "join",
				label: t("workflow.aside.join", "Join session"),
				icon: <IconVideo size={16} />,
				href: reviewHref(call.index),
				primary: !!live || !action,
			};
		}
	}

	const character = isAI ? checkpoint.character : null;
	const aiLabel = t("checkpoints.review.curator", "AI curator");
	const name = isAI
		? (character?.name ?? AI_CURATOR_NAME)
		: (curator?.name ?? "");
	const role = [isAI ? aiLabel : t("workflow.aside.curator", "Curator"), date]
		.filter(Boolean)
		.join(" · ");

	return (
		<InverseBand density="product" className={styles.curatorNote}>
			<div className={styles.asideCurator}>
				{isAI ? (
					<AppAvatar size={40} src={character?.avatar ?? AI_CURATOR_AVATAR} />
				) : (
					<AppAvatar src={curator?.image} size={40}>
						{curator?.name?.[0]}
					</AppAvatar>
				)}
				<div className={styles.grow}>
					<Text strong ellipsis className={styles.curatorName}>
						{name}
					</Text>
					{role && (
						<Text type="secondary" className={styles.asideMeta}>
							{role}
						</Text>
					)}
				</div>
				{/* The AI curator answers in its letters, not in a chat. */}
				{!isAI && (
					<Tooltip title={t("workflow.aside.chat", "Checkpoint chat")}>
						<Button
							icon={<IconMessageCircle size={16} />}
							loading={chatLoading}
							onClick={onChat}
							aria-label={t("workflow.aside.chat", "Checkpoint chat")}
						/>
					</Tooltip>
				)}
			</div>
			<Paragraph ellipsis={{ rows: 5 }} className={styles.curatorText}>
				{message}
			</Paragraph>
			{(action || join) && (
				<div className={styles.curatorActions}>
					{action && (
						<Link href={action.href}>
							<Button type="primary" block icon={action.icon}>
								{action.label}
							</Button>
						</Link>
					)}
					{join && (
						<Link href={join.href}>
							<Button
								type={join.primary ? "primary" : "default"}
								block
								icon={join.icon}
							>
								{join.label}
							</Button>
						</Link>
					)}
				</div>
			)}
		</InverseBand>
	);
}
