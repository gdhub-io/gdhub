"use client";

import { IconArrowBackUp, IconCheck, IconReceipt } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Card, Flex, Typography } from "antd";
import axios from "axios";
import { useState } from "react";
import { IconTile } from "@/components/ui";
import { CheckpointStatus } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

export type MoneyNoticeProps = {
	checkpoint: CheckpointDto;
	/**
	 * Back from the checkout before the webhook landed. Only the payment step
	 * knows that — from its own URL — and it is not a state of the checkpoint.
	 */
	starting?: boolean;
	/** A line of text and a link, for the record under a page — not the block. */
	plain?: boolean;
};

/**
 * Where the money for this checkpoint has got to — frame `SwaKm`.
 *
 * Held, taken, or let go are three readings of one fact, so they are one block
 * with three faces. It is the only thing on any screen that says what happened
 * to the author's money, which is why it lives here rather than being redrawn
 * wherever a page needs to mention it.
 */
export function MoneyNotice({ checkpoint, starting, plain }: MoneyNoticeProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [fetching, setFetching] = useState(false);

	const held = checkpoint.status === CheckpointStatus.AwaitingCurator;
	const declined =
		checkpoint.status === CheckpointStatus.Draft &&
		!!checkpoint.curatorDeclinedAt &&
		!checkpoint.curator;

	// The receipt is the provider's own page, fetched when asked rather than
	// stored: what it says is their record, not ours.
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

	// A draft nobody has bought has nothing to say about money, and a block
	// saying nothing is worse than no block.
	if (!checkpoint.paymentId && !held && !declined && !starting) return null;

	const money = declined
		? {
				tone: "released" as const,
				icon: IconArrowBackUp,
				ink: "var(--gd-color-text-secondary)",
				title: t(
					"checkpoints.paid.released",
					"The reservation was let go — nothing was charged",
				),
			}
		: {
				tone: "paid" as const,
				icon: IconCheck,
				ink: "var(--gd-success-solid)",
				title: starting
					? t("checkpoints.paid.starting", "Payment received — starting")
					: held
						? t("checkpoints.paid.held", "The money is reserved")
						: t("checkpoints.paid.received", "Payment received"),
			};

	// A receipt exists once the money has moved; a reservation and a released
	// hold have nothing to show for themselves.
	const hasReceipt = !!checkpoint.paymentId && !held && !declined;

	if (plain) {
		return (
			<Flex gap={8} align="center">
				<Typography.Text type="secondary">{money.title}</Typography.Text>
				{hasReceipt && (
					<Button
						type="link"
						size="small"
						loading={fetching}
						onClick={openReceipt}
					>
						{t("checkpoints.paid.receipt", "Receipt")}
					</Button>
				)}
			</Flex>
		);
	}

	return (
		<Card className={styles.block} data-tone={money.tone}>
			<Flex gap={8} align="center">
				<IconTile
					icon={money.icon}
					size="xs"
					tint="var(--gd-color-surface)"
					ink={money.ink}
				/>
				<Flex vertical gap={4} className={styles.text}>
					<Typography.Text className={styles.title}>
						{money.title}
					</Typography.Text>
				</Flex>

				{hasReceipt && (
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
	);
}
