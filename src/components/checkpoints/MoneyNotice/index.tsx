"use client";

import { IconArrowBackUp, IconCheck, IconReceipt } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Typography } from "antd";
import axios from "axios";
import { useState } from "react";
import { CheckpointStatus } from "@/config/prisma-enums";
import { isDeclined } from "@/lib/checkpoints/draft";
import type { CheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

export type MoneyNoticeProps = {
	checkpoint: CheckpointDto;
	/**
	 * Back from the checkout before the webhook landed. Only the payment step
	 * knows that — from its own URL — and it is not a state of the checkpoint.
	 */
	settling?: boolean;
	/** Lined up with the text inside the cards above it. */
	inset?: boolean;
	/** One short centred line under a paid screen's heading, "Receipt" beside it. */
	centered?: boolean;
};

/**
 * Where the money for this checkpoint has got to, as one plain line with the
 * receipt beside it.
 *
 * Held, taken, or let go are three readings of one fact, so they are one line
 * with three faces. It is the only thing on any screen that says what happened
 * to the author's money, which is why it lives here rather than being redrawn
 * wherever a page needs to mention it.
 */
export function MoneyNotice({
	checkpoint,
	settling,
	inset,
	centered,
}: MoneyNoticeProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [fetching, setFetching] = useState(false);

	const held = checkpoint.status === CheckpointStatus.AwaitingCurator;
	const declined = isDeclined(checkpoint);

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

	// A draft nobody has bought has nothing to say about money, and a line
	// saying nothing is worse than no line.
	if (!checkpoint.paymentId && !held && !declined && !settling) return null;

	const money = declined
		? {
				icon: IconArrowBackUp,
				ink: "var(--gd-color-text-secondary)",
				title: t(
					"checkpoints.paid.released",
					"The reservation was let go — nothing was charged",
				),
			}
		: {
				icon: IconCheck,
				ink: "var(--gd-success-solid)",
				title: settling
					? t(
							"checkpoints.paid.receivedOnTheWay",
							"Payment received — getting you on your way",
						)
					: held
						? t("checkpoints.paid.held", "The money is reserved")
						: t("checkpoints.paid.received", "Payment received"),
			};

	// A hold already has a charge behind it; a released one has nothing to show.
	const hasReceipt = !!checkpoint.paymentId && !declined;

	return (
		<Flex
			gap={8}
			align="center"
			justify={centered ? "center" : undefined}
			wrap
			className={[
				styles.line,
				inset && styles.inset,
				centered && styles.centered,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<money.icon size={16} color={money.ink} />
			<Typography.Text className={styles.text}>{money.title}</Typography.Text>
			{hasReceipt && (
				<Button
					type="link"
					size="small"
					icon={<IconReceipt size={16} />}
					loading={fetching}
					onClick={openReceipt}
					className={styles.receipt}
				>
					{centered
						? t("checkpoints.paid.receipt", "Receipt")
						: t("checkpoints.paid.downloadReceipt", "Download receipt")}
				</Button>
			)}
		</Flex>
	);
}
