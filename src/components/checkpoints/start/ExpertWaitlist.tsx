"use client";

import { IconCircleCheck, IconHourglass } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Skeleton, Typography } from "antd";
import { IconTile } from "@/components/ui";
import { CHECKPOINT_PRICE_CURRENCY } from "@/config/checkpoint";
import { CHECKPOINT_MIN_CURATOR_PRICE } from "@/config/checkpoint-pricing";
import styles from "./CuratorStep.module.scss";

export type ExpertWaitlistProps = {
	/** Undefined while the answer is on its way. */
	joined: boolean | undefined;
	joining: boolean;
	onJoin: () => void;
	onChooseAI: () => void;
};

/** Frames 12.4a / 12.4b and 04: an expert is a waitlist until it opens. */
export function ExpertWaitlist({
	joined,
	joining,
	onJoin,
	onChooseAI,
}: ExpertWaitlistProps) {
	const { t } = useTranslate();

	if (joined === undefined) return <Skeleton active paragraph={{ rows: 2 }} />;

	return (
		<Flex vertical gap={16} className={styles.waitlist}>
			<Flex gap={12} align="start">
				<IconTile
					icon={joined ? IconCircleCheck : IconHourglass}
					tint="var(--gd-fill-subtle)"
					ink="var(--gd-color-text)"
				/>
				<Flex vertical gap={2} flex={1}>
					<Typography.Text strong>
						{joined
							? t("checkpoints.waitlist.joined", "You're on the waitlist")
							: t(
									"checkpoints.waitlist.title",
									"Run with an expert is coming soon",
								)}
					</Typography.Text>
					<Typography.Text type="secondary" className={styles.note}>
						{joined
							? t(
									"checkpoints.waitlist.joinedNote",
									"We'll email you when running with an expert opens. Until then, the AI curator can run this checkpoint.",
								)
							: t(
									"checkpoints.waitlist.note",
									"An industry expert takes you to the checkpoint on calls. It opens later: join the waitlist and we'll email you when it does. Until then, the AI curator can run this checkpoint.",
								)}
					</Typography.Text>
				</Flex>
				{/* Said up front, so only those ready to pay join (frame 12.4b). */}
				<Flex vertical align="end" className={styles.waitlistPrice}>
					<Typography.Text strong className={styles.waitlistAmount}>
						{t("checkpoints.waitlist.price", "from {currency}{price}", {
							currency: CHECKPOINT_PRICE_CURRENCY,
							price: CHECKPOINT_MIN_CURATOR_PRICE,
						})}
					</Typography.Text>
					<Typography.Text type="secondary" className={styles.note}>
						{t("checkpoints.waitlist.paid", "one payment")}
					</Typography.Text>
				</Flex>
			</Flex>
			<Flex gap={8}>
				{!joined && (
					<Button type="primary" loading={joining} onClick={onJoin}>
						{t("checkpoints.waitlist.join", "Join the waitlist")}
					</Button>
				)}
				<Button onClick={onChooseAI}>
					{t("checkpoints.waitlist.chooseAI", "Choose the AI curator")}
				</Button>
			</Flex>
		</Flex>
	);
}
