"use client";

import { IconHourglassHigh, IconUserX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Modal, Typography } from "antd";
import dayjs from "dayjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconTile } from "@/components/ui";
import { CheckpointStatus } from "@/config/prisma-enums";
import { useCancelCheckpoint } from "@/hooks/checkpoints";
import type { CheckpointDto } from "@/types/checkpoints";
import { CuratorBadge } from "../CuratorBadge";
import { MoneyNotice } from "../MoneyNotice";
import { ReplaceCuratorModal } from "./ReplaceCuratorModal";
import styles from "./style.module.scss";

/** How often the page asks again while it waits for Stripe to call us. */
const SETTLE_EVERY = 3000;

export type PaidPanelProps = { checkpoint: CheckpointDto };

/**
 * What the author sees between paying and the 28 days running.
 *
 * Two waits, one panel. Stripe returns the author faster than it calls the
 * webhook, so for a few seconds a paid checkpoint is still a draft — that is
 * shown as starting, not as an error, and the panel settles itself by asking
 * again. Then, when a person is curating, the longer wait: they have to take it
 * on before day one exists.
 *
 * The screen never treats the return from Stripe as proof of anything. It shows
 * what the server says the status is, and the status only moves on the webhook.
 */
export function PaidPanel({ checkpoint }: PaidPanelProps) {
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
	// The money is held on the card and not yet taken: it becomes a charge when
	// the curator accepts, and saying "paid" before that is a lie the author
	// finds out about when the hold drops off.
	const held = checkpoint.status === CheckpointStatus.AwaitingCurator;
	// Paid for, a draft again and carrying nobody: the only way a checkpoint
	// reaches that is a curator handing it back.
	const declined =
		checkpoint.status === CheckpointStatus.Draft &&
		!!checkpoint.curatorDeclinedAt &&
		!checkpoint.curator;

	useEffect(() => {
		if (!settling) return;

		const timer = setInterval(() => {
			queryClient.invalidateQueries({
				queryKey: ["project-checkpoints", checkpoint.projectId],
			});
		}, SETTLE_EVERY);

		return () => clearInterval(timer);
	}, [settling, queryClient, checkpoint.projectId]);

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
					router.push(pathname?.replace(/\/[^/]+$/, "") ?? "");
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

	const dates =
		checkpoint.startedAt && checkpoint.dueAt
			? t("checkpoints.paid.dates", "{from} – {to}", {
					from: dayjs(checkpoint.startedAt).format("D MMM"),
					to: dayjs(checkpoint.dueAt).format("D MMM YYYY"),
				})
			: null;

	return (
		<Flex vertical gap={16}>
			<MoneyNotice checkpoint={checkpoint} />

			{!settling && (
				<Flex
					vertical
					gap={14}
					align="center"
					className={styles.waiting}
					data-testid="awaiting-curator"
				>
					<IconTile icon={declined ? IconUserX : IconHourglassHigh} />
					<Flex vertical gap={12} align="center" className={styles.waitingText}>
						<Flex vertical gap={4} align="center">
							<Typography.Text className={styles.title}>
								{declined
									? t(
											"checkpoints.paid.declined",
											"This expert cannot take it on right now",
										)
									: t(
											"checkpoints.paid.awaiting",
											"Waiting for the curator to take it on",
										)}
							</Typography.Text>
							<Typography.Text type="secondary" className={styles.dates}>
								{declined
									? t(
											"checkpoints.paid.declinedBody",
											"Pick another expert and the checkpoint goes to them instead.",
										)
									: dates &&
										t("checkpoints.paid.planned", "Planned for {dates}", {
											dates,
										})}
							</Typography.Text>
						</Flex>

						{/* Waiting, the way out sits quietly beside the curator — it is
						    rarely what the author wants. Declined, it is the only thing
						    left to do, so it is the button. */}
						{declined ? (
							<Button type="primary" onClick={() => setReplacing(true)}>
								{t("checkpoints.paid.pickAnother", "Pick another curator")}
							</Button>
						) : (
							<Flex gap={10} align="center" wrap justify="center">
								<CuratorBadge
									kind={checkpoint.curatorKind}
									curator={checkpoint.curator}
								/>
								<Button
									type="link"
									size="small"
									className={styles.quiet}
									onClick={() => setReplacing(true)}
								>
									{t("checkpoints.paid.replace", "Replace the curator")}
								</Button>
							</Flex>
						)}
					</Flex>
				</Flex>
			)}

			{!settling && (
				<Flex justify="center">
					<Button
						type="link"
						size="small"
						className={styles.quiet}
						loading={cancel.isPending}
						onClick={askToCancel}
					>
						{held
							? t("checkpoints.paid.cancelHold", "Cancel and release the money")
							: t("checkpoints.paid.cancel", "Cancel and refund")}
					</Button>
				</Flex>
			)}

			<ReplaceCuratorModal
				checkpointId={checkpoint.id}
				currentCuratorId={checkpoint.curator?.id}
				unavailable={checkpoint.declinedCuratorIds}
				open={replacing}
				onClose={() => setReplacing(false)}
			/>
		</Flex>
	);
}
