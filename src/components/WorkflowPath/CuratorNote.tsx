"use client";

import {
	IconFileText,
	IconLock,
	IconMessageCircle,
	IconVideo,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import type { ReactNode } from "react";
import { CallCountdown } from "@/components/checkpoints/CallRoom/CallCountdown";
import { firstName } from "@/components/checkpoints/CallRoom/CallHeader";
import { useLockedJoinLabel } from "@/components/checkpoints/CallRoom/ClosedStage";
import { useCuratorNow } from "@/components/checkpoints/CuratorReview/useCuratorNow";
import { InverseBand } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { AI_CURATOR_AVATAR } from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
} from "@/config/prisma-enums";
import { callState } from "@/lib/checkpoint-call";
import type { CheckpointDto } from "@/types/checkpoints";
import { formatShort } from "./dates";
import styles from "./style.module.scss";

const { Text, Paragraph } = Typography;

type Action = { label: string; icon: ReactNode; href: string };
/** No href while the room is still closed. */
type Join = Omit<Action, "href"> & { href: string | null };

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
	const lockedJoin = useLockedJoinLabel();
	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const { curator } = checkpoint;
	const said = useCuratorNow(isAI ? checkpoint.curatorNow : null, [
		"checkpoint",
		checkpoint.id,
	]);

	let date: string | null = null;
	let message: string;
	let action: Action | null = null;
	let join: Join | null = null;
	let countdown: string | null = null;

	let deadline: string | null = null;

	if (isAI) {
		const index = checkpoint.curatorNow?.index ?? 1;
		date = checkpoint.curatorNow ? formatShort(checkpoint.curatorNow.at) : null;
		message = said?.message ?? "";
		deadline = said?.deadline ?? null;
		if (said?.label) {
			action = {
				label: said.label,
				icon: <IconFileText size={16} />,
				href: reviewHref(index),
			};
		}
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
		const notesReady = !!reviewed && reviewed.index === held?.index;

		if (live) {
			date = t("workflow.aside.today", "today");
			message = t(
				"workflow.aside.callLive",
				"Our call is on now — the room is open, come in.",
			);
		} else if (held?.missed) {
			const name = firstName(curator?.name ?? "");
			const missed = dayjs(held.scheduledAt).format("D MMM");
			const at = next && dayjs(next.scheduledAt);
			date = at ? at.format("D MMM") : missed;
			message = at
				? t(
						"workflow.aside.missedNext",
						"{name} didn't join the call on {missed}. The next one is on {date} at {time}.",
						{
							name,
							missed,
							date: at.format("dddd D MMM"),
							time: at.format("HH:mm"),
						},
					)
				: t(
						"workflow.aside.missed",
						"{name} didn't join the call on {missed}.",
						{ name, missed },
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
				label: t("checkpoints.call.openReview", "Open the review"),
				icon: <IconFileText size={16} />,
				href: reviewHref(reviewed.index),
			};
		}
		if (live) {
			join = {
				label: t("workflow.aside.join", "Join session"),
				icon: <IconVideo size={16} />,
				href: reviewHref(live.index),
			};
		} else if (next) {
			countdown = next.scheduledAt;
			// Until the room opens the button says when it will.
			join = {
				label: lockedJoin(next.scheduledAt, now),
				icon: <IconLock size={16} />,
				href: null,
			};
		}
	}

	const character = isAI ? checkpoint.character : null;
	const aiLabel = t("checkpoints.review.curator", "AI curator");
	const name = isAI ? (character?.name ?? aiLabel) : (curator?.name ?? "");
	const role = [
		isAI
			? character
				? aiLabel
				: null
			: t("workflow.aside.curator", "Curator"),
		date,
	]
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
			{deadline && (
				<Text type="secondary" className={styles.asideMeta}>
					{deadline}
				</Text>
			)}
			{countdown && <CallCountdown at={countdown} />}
			{(action || join) && (
				<div className={styles.curatorActions}>
					{action && (
						<Link href={action.href}>
							<Button type="primary" block icon={action.icon}>
								{action.label}
							</Button>
						</Link>
					)}
					{join &&
						(join.href ? (
							<Link href={join.href}>
								<Button type="primary" block icon={join.icon}>
									{join.label}
								</Button>
							</Link>
						) : (
							<Button block disabled icon={join.icon}>
								{join.label}
							</Button>
						))}
				</div>
			)}
		</InverseBand>
	);
}
