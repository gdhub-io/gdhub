"use client";

import { IconClockHour4, IconHourglassHigh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Card, Flex, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";
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
	const queryClient = useQueryClient();

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

	const dates =
		checkpoint.startedAt && checkpoint.dueAt
			? t("checkpoints.paid.dates", "{from} – {to}", {
					from: dayjs(checkpoint.startedAt).format("D MMM"),
					to: dayjs(checkpoint.dueAt).format("D MMM YYYY"),
				})
			: null;

	return (
		<Card className={styles.panel}>
			<Flex gap={16} align="flex-start">
				<IconTile icon={settling ? IconHourglassHigh : IconClockHour4} />
				<Flex vertical gap={8} className={styles.text}>
					<Typography.Text className={styles.title}>
						{settling
							? t("checkpoints.paid.starting", "Payment received — starting")
							: t(
									"checkpoints.paid.awaiting",
									"Waiting for the curator to take it on",
								)}
					</Typography.Text>

					<Typography.Text type="secondary" className={styles.body}>
						{settling
							? t(
									"checkpoints.paid.settling",
									"This settles on its own in a few seconds. Nothing else is needed from you.",
								)
							: t(
									"checkpoints.paid.awaitingBody",
									"The 28 days begin when they accept, not when you pay. If they turn it down you pick another curator and nothing is charged again.",
								)}
					</Typography.Text>

					{!settling && (
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
					)}
				</Flex>
			</Flex>
		</Card>
	);
}
