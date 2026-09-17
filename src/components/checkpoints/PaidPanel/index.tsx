"use client";

import { IconCheck, IconHourglassHigh, IconReceipt } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Button, Card, Flex, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { IconTile } from "@/components/ui";
import { CheckpointStatus } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { CuratorBadge } from "../CuratorBadge";
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
	const [fetching, setFetching] = useState(false);

	const settling = checkpoint.status === CheckpointStatus.Draft;

	useEffect(() => {
		if (!settling) return;

		const timer = setInterval(() => {
			queryClient.invalidateQueries({
				queryKey: ["project-checkpoints", checkpoint.projectId],
			});
		}, SETTLE_EVERY);

		return () => clearInterval(timer);
	}, [settling, queryClient, checkpoint.projectId]);

	// The receipt is Stripe's own page, fetched when asked rather than stored.
	const openReceipt = async () => {
		if (!checkpoint.paymentId) return;

		setFetching(true);
		try {
			const { data } = await axios.get<{ url: string }>(
				"/api/user/payment/receipt",
				{ params: { paymentId: checkpoint.paymentId } },
			);
			if (data?.url) window.open(data.url, "_blank", "noopener");
		} catch {
			message.error(
				t("settings.payments.receiptFailed", "The receipt could not be opened"),
			);
		} finally {
			setFetching(false);
		}
	};

	const dates =
		checkpoint.startedAt && checkpoint.dueAt
			? t("checkpoints.paid.dates", "{from} – {to}", {
					from: dayjs(checkpoint.startedAt).format("D MMM"),
					to: dayjs(checkpoint.dueAt).format("D MMM YYYY"),
				})
			: null;

	return (
		<Flex vertical gap={16}>
			{/* Two facts, two blocks — frame `P8Tfn`. The money is settled and the
			    receipt is theirs; the wait is somebody else's move. Holding both in
			    one paragraph made the second read as a condition of the first. */}
			<Card className={styles.block} data-tone="paid">
				<Flex gap={14} align="flex-start">
					<IconTile icon={IconCheck} />
					<Flex vertical gap={4} className={styles.text}>
						<Typography.Text className={styles.title}>
							{settling
								? t("checkpoints.paid.starting", "Payment received — starting")
								: t("checkpoints.paid.received", "Payment received")}
						</Typography.Text>
						<Typography.Text type="secondary" className={styles.body}>
							{settling
								? t(
										"checkpoints.paid.settling",
										"This settles on its own in a few seconds. Nothing else is needed from you.",
									)
								: t(
										"checkpoints.paid.receivedBody",
										"The purchase is complete and the receipt is yours to keep.",
									)}
						</Typography.Text>
					</Flex>

					{checkpoint.paymentId && (
						<Button
							icon={<IconReceipt size={16} stroke={1.6} />}
							loading={fetching}
							onClick={openReceipt}
						>
							{t("checkpoints.paid.receipt", "Receipt")}
						</Button>
					)}
				</Flex>
			</Card>

			{!settling && (
				<Card className={styles.block}>
					<Flex gap={14} align="flex-start">
						<IconTile icon={IconHourglassHigh} />
						<Flex vertical gap={10} className={styles.text}>
							<Flex vertical gap={4}>
								<Typography.Text className={styles.title}>
									{t(
										"checkpoints.paid.awaiting",
										"Waiting for the curator to take it on",
									)}
								</Typography.Text>
								<Typography.Text type="secondary" className={styles.body}>
									{t(
										"checkpoints.paid.awaitingBody",
										"The 28 days begin when they accept, not when you pay. If they turn it down you pick another curator and nothing is charged again.",
									)}
								</Typography.Text>
							</Flex>

							<Flex gap={12} align="center" wrap>
								<CuratorBadge
									kind={checkpoint.curatorKind}
									curator={checkpoint.curator}
								/>
								{dates && (
									<Typography.Text type="secondary" className={styles.dates}>
										{t("checkpoints.paid.planned", "Planned for {dates}", {
											dates,
										})}
									</Typography.Text>
								)}
							</Flex>
						</Flex>
					</Flex>
				</Card>
			)}
		</Flex>
	);
}
