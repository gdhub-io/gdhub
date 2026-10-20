"use client";

import {
	IconCheck,
	IconHourglassHigh,
	IconMail,
	IconUserX,
} from "@tabler/icons-react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Modal, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { IconTile } from "@/components/ui";
import { purchaseParams } from "@/config/analytics-events";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_DAYS,
	CURATOR_ANSWER_DAYS,
} from "@/config/checkpoint";
import { curatorPrice } from "@/config/checkpoint-pricing";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import { trackCheckpoint } from "@/helpers/gtm";
import {
	useCancelCheckpoint,
	useCheckpointCurators,
} from "@/hooks/checkpoints";
import type { CheckpointDto } from "@/types/checkpoints";
import { CuratorBadge } from "../CuratorBadge";
import { MoneyNotice } from "../MoneyNotice";
import { ReplaceCuratorModal } from "./ReplaceCuratorModal";
import styles from "./style.module.scss";

/**
 * How the page asks again while it waits for Stripe to call us: often at
 * first, when the webhook is due, then rarely, and not at all after two
 * minutes — a tab left open must not keep the server asking Stripe forever.
 */
const SETTLE_FAST = 3000;
const SETTLE_SLOW = 10000;
const SETTLE_FAST_FOR = 30000;
const SETTLE_GIVE_UP = 120000;

// The list is what the purchase page reads paid and running from, so it has to
// move with the checkpoint, not only the checkpoint itself.
const refresh = (
	queryClient: QueryClient,
	{ id, projectId }: Pick<CheckpointDto, "id" | "projectId">,
) => {
	queryClient.invalidateQueries({ queryKey: ["checkpoint", id] });
	queryClient.invalidateQueries({
		queryKey: ["project-checkpoints", projectId],
	});
};

export type PaidPanelProps = {
	checkpoint: CheckpointDto;
	/** The project's workflow: "Go to the workflow", and where a cancelled checkpoint leaves to. */
	exitHref?: string;
	/** The project's settings, offered while a person decides whether to take it on. */
	projectHref?: string;
};

/**
 * What the author sees between paying and the 28 days running — frames 12.6
 * (`hl76Z`, AI curator) and 12.7 (`YgVnb`, a person), one centred column.
 *
 * Stripe returns the author faster than it calls the webhook, so for a few
 * seconds a paid checkpoint is still a draft — shown as on its way, not as an
 * error, and the panel settles itself by asking again. The AI curator then
 * runs it at once; a person has to take it on first, and until then the money
 * is only held.
 *
 * The screen never treats the return from Stripe as proof of anything. It shows
 * what the server says the status is, and the status only moves on the webhook.
 */
export function PaidPanel({
	checkpoint,
	exitHref,
	projectHref,
}: PaidPanelProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const queryClient = useQueryClient();
	const [replacing, setReplacing] = useState(false);
	const router = useRouter();
	const pathname = usePathname();
	const cancel = useCancelCheckpoint(checkpoint.id, checkpoint.projectId);

	// The few seconds between Stripe returning the author and the webhook landing.
	// A decline looks identical by status and payment — both are a draft with no
	// money on it — so the refusal is what tells them apart.
	const settling =
		checkpoint.status === CheckpointStatus.Draft &&
		!checkpoint.paymentId &&
		!checkpoint.curatorDeclinedAt;
	// Paid for, a draft again and carrying nobody: the only way a checkpoint
	// reaches that is a curator handing it back.
	const declined =
		checkpoint.status === CheckpointStatus.Draft &&
		!!checkpoint.curatorDeclinedAt &&
		!checkpoint.curator;
	// The AI curator needs nobody's yes: once the webhook lands the days run.
	const onTheWay =
		checkpoint.curatorKind === CheckpointCuratorKind.AI &&
		(checkpoint.status === CheckpointStatus.Active ||
			checkpoint.status === CheckpointStatus.Review);

	const reserved = checkpoint.status === CheckpointStatus.AwaitingCurator;
	// The wizard's own query key, so it is usually in the cache already.
	const curators = useCheckpointCurators(checkpoint.stageName);
	// A person's level, which sets the list price, is on the curator list.
	const level = reserved
		? curators.data?.find((row) => row.userId === checkpoint.curator?.id)?.level
		: null;
	const levelKnown = !reserved || !curators.isPending;
	useEffect(() => {
		if (!(onTheWay || reserved) || !levelKnown) return;
		const listPrice = level ? curatorPrice(level) : CHECKPOINT_AI_PRICE;
		trackCheckpoint(
			"checkpoint_paid",
			{
				...purchaseParams(checkpoint, level),
				outcome: onTheWay ? "ai_started" : "expert_reserved",
				promo_used:
					checkpoint.heldPrice != null && checkpoint.heldPrice < listPrice,
			},
			{ once: `paid:${checkpoint.id}`, persist: true },
		);
	}, [onTheWay, reserved, levelKnown, level, checkpoint]);

	const [waitingSince, setWaitingSince] = useState(() => Date.now());
	const [gaveUp, setGaveUp] = useState(false);

	useEffect(() => {
		if (!settling || gaveUp) return;

		let timer: ReturnType<typeof setTimeout>;
		const askLater = () => {
			const waited = Date.now() - waitingSince;

			if (waited >= SETTLE_GIVE_UP) {
				setGaveUp(true);
				return;
			}

			timer = setTimeout(
				() => {
					refresh(queryClient, {
						id: checkpoint.id,
						projectId: checkpoint.projectId,
					});
					askLater();
				},
				waited < SETTLE_FAST_FOR ? SETTLE_FAST : SETTLE_SLOW,
			);
		};

		askLater();

		return () => clearTimeout(timer);
	}, [
		settling,
		gaveUp,
		waitingSince,
		queryClient,
		checkpoint.id,
		checkpoint.projectId,
	]);

	const askAgain = () => {
		setGaveUp(false);
		setWaitingSince(Date.now());
		refresh(queryClient, checkpoint);
	};

	// Cancelling takes the money back and closes the checkpoint, so it asks
	// first: the confirm is the only place a filled red button is allowed.
	const askToCancel = () =>
		Modal.confirm({
			title: t("checkpoints.paid.cancelTitle", "Cancel this checkpoint?"),
			content: t(
				"checkpoints.paid.cancelNote",
				"The reservation is let go, nothing is charged, and the checkpoint is deleted along with what you wrote for it.",
			),
			okText: t("checkpoints.paid.cancelOk", "Cancel and refund"),
			okButtonProps: { danger: true },
			cancelText: t("checkpoints.paid.cancelKeep", "Keep it"),
			onOk: async () => {
				try {
					await cancel.mutateAsync();
					// The checkpoint no longer exists, so neither does this page.
					router.push(exitHref ?? pathname?.replace(/\/[^/]+$/, "") ?? "");
				} catch {
					message.error(
						t(
							"checkpoints.paid.cancelFailed",
							"The checkpoint was not cancelled",
						),
					);
				}
			},
		});

	const heading = (title: string, sub?: string | null) => (
		<Flex vertical gap={4} align="center">
			<Typography.Title level={3} className={styles.title}>
				{title}
			</Typography.Title>
			{sub && (
				<Typography.Text type="secondary" className={styles.sub}>
					{sub}
				</Typography.Text>
			)}
		</Flex>
	);

	const toWorkflow = exitHref && (
		<Link href={exitHref}>
			<Button type="primary">
				{t("checkpoints.paid.toWorkflow", "Go to the workflow")}
			</Button>
		</Link>
	);

	const quietCancel = (
		<Button
			type="link"
			size="small"
			className={styles.quiet}
			loading={cancel.isPending}
			onClick={askToCancel}
		>
			{t("checkpoints.paid.cancel", "Cancel and refund")}
		</Button>
	);

	const number = checkpoint.number ?? checkpoint.order;
	// A day 1 chosen for later is not today, and "Day 1 of 28" would say it is.
	const firstDayAhead =
		!!checkpoint.startedAt &&
		dayjs.utc(checkpoint.startedAt).isAfter(dayjs.utc(), "day");

	let body: ReactNode;

	if (settling) {
		body = (
			<>
				<IconTile icon={IconHourglassHigh} size="lg" />
				{heading(t("checkpoints.ready.title", "Payment successful"))}
				<MoneyNotice checkpoint={checkpoint} settling centered />
				{gaveUp && (
					<Flex vertical gap={8} align="center">
						<Typography.Text type="secondary" className={styles.sub}>
							{t(
								"checkpoints.paid.slow",
								"The payment is taking longer than usual to confirm. If you paid, it will show up here — check again in a minute.",
							)}
						</Typography.Text>
						<Button onClick={askAgain}>
							{t("checkpoints.paid.checkAgain", "Check again")}
						</Button>
					</Flex>
				)}
			</>
		);
	} else if (declined) {
		body = (
			<>
				<IconTile icon={IconUserX} size="lg" />
				{heading(
					t(
						"checkpoints.paid.declined",
						"This expert cannot take it on right now",
					),
					t(
						"checkpoints.paid.declinedBody",
						"Pick another expert and the checkpoint goes to them instead.",
					),
				)}
				<MoneyNotice checkpoint={checkpoint} centered />
				{/* Declined, picking someone else is the only thing left to do, so it is the button. */}
				<Button type="primary" onClick={() => setReplacing(true)}>
					{t("checkpoints.paid.pickAnother", "Pick another curator")}
				</Button>
				{quietCancel}
			</>
		);
	} else if (onTheWay) {
		body = (
			<>
				<IconTile
					icon={IconCheck}
					size="lg"
					tint="var(--gd-success-tint)"
					ink="var(--gd-success-on-tint)"
				/>
				{heading(
					t("checkpoints.paid.onYourWay", "You're on your way"),
					firstDayAhead
						? t(
								"checkpoints.paid.onYourWayFrom",
								"Day 1 on {date} · Checkpoint {number} · AI curator",
								{
									date: dayjs.utc(checkpoint.startedAt).format("D MMM"),
									number,
								},
							)
						: t(
								"checkpoints.paid.onYourWayLine",
								"Day {day} of {days} · Checkpoint {number} · AI curator",
								{ day: checkpoint.day ?? 1, days: CHECKPOINT_DAYS, number },
							),
				)}
				<MoneyNotice checkpoint={checkpoint} centered />
				{toWorkflow}
			</>
		);
	} else {
		// Bought, and the person asked to run it has not answered: the money is
		// held, not taken, and saying "paid" before they accept is a lie the
		// author finds out about when the hold drops off.
		body = (
			<>
				<IconTile icon={IconHourglassHigh} size="lg" />
				{heading(
					t("checkpoints.paid.reservedTitle", "Payment reserved"),
					t(
						"checkpoints.paid.reservedSub",
						"Charged when the curator accepts.",
					),
				)}
				<Flex gap={8} align="center" justify="center">
					<IconMail size={16} className={styles.mail} />
					<Typography.Text className={styles.sub}>
						{t(
							"checkpoints.paid.emailWhenAnswers",
							"We'll email you when {curator} answers — usually within {days} days.",
							{
								curator:
									checkpoint.curator?.name?.split(" ")[0] ??
									t("checkpoints.paid.theCurator", "the curator"),
								days: CURATOR_ANSWER_DAYS,
							},
						)}
					</Typography.Text>
				</Flex>
				<CuratorBadge
					kind={checkpoint.curatorKind}
					curator={checkpoint.curator}
				/>
				<MoneyNotice checkpoint={checkpoint} centered />
				<Flex gap={8} justify="center" wrap>
					{toWorkflow}
					{projectHref && (
						<Link href={projectHref}>
							<Button>
								{t("checkpoints.paid.fillProject", "Fill in your project")}
							</Button>
						</Link>
					)}
				</Flex>
				{/* Present and findable, rarely what the author came to do. */}
				<Flex gap={16} justify="center" wrap>
					<Button
						type="link"
						size="small"
						className={styles.quiet}
						onClick={() => setReplacing(true)}
					>
						{t("checkpoints.paid.replace", "Replace the curator")}
					</Button>
					{quietCancel}
				</Flex>
			</>
		);
	}

	return (
		<Flex vertical gap={24} align="center" className={styles.column}>
			{body}

			<ReplaceCuratorModal
				checkpointId={checkpoint.id}
				currentCuratorId={checkpoint.curator?.id}
				unavailable={checkpoint.declinedCuratorIds}
				price={checkpoint.heldPrice}
				stage={checkpoint.stageName}
				open={replacing}
				onClose={() => setReplacing(false)}
			/>
		</Flex>
	);
}
