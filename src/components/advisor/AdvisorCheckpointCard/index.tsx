"use client";

import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";
import { IconTile } from "@/components/ui";
import { CHECKPOINT_DAYS } from "@/config/checkpoint";
import type { AdvisorCheckpointDto } from "@/types/checkpoints";
import { CheckpointCardModal } from "../CheckpointCardModal";
import styles from "./style.module.scss";

export type AdvisorCheckpointCardProps = {
	checkpoint: AdvisorCheckpointDto;
	/** Only the group waiting on an answer carries the two buttons. */
	answerable?: boolean;
};

/**
 * One checkpoint on the advisor's board — frame `F7WRD`.
 *
 * The project comes first because that is what the curator recognises; the
 * checkpoint's own number, stage and dates are the line under it. The goal is
 * quoted in full: it is the thing they are being asked to hold the 28 days to.
 * The answer itself is given in the brief, once the plan has been read.
 */
export function AdvisorCheckpointCard({
	checkpoint,
	answerable,
}: AdvisorCheckpointCardProps) {
	const { t } = useTranslate();
	const [briefOpen, setBriefOpen] = useState(false);

	const dates =
		checkpoint.startedAt && checkpoint.dueAt
			? `${dayjs(checkpoint.startedAt).format("D MMM")}–${dayjs(checkpoint.dueAt).format("D MMM YYYY")}`
			: null;

	return (
		<section className={styles.card} data-asked={answerable || undefined}>
			<Flex gap={12} align="flex-start">
				<IconTile icon={IconDeviceGamepad2} size="lg" />

				<Flex vertical gap={8} className={styles.text}>
					<Flex vertical gap={4}>
						<Typography.Text className={styles.project}>
							{checkpoint.project.name}
						</Typography.Text>
						<Typography.Text className={styles.meta}>
							{[
								t("checkpoints.number", "Checkpoint {number}", {
									number: checkpoint.order,
								}),
								checkpoint.stageName,
								dates,
							]
								.filter(Boolean)
								.join(" · ")}
						</Typography.Text>
					</Flex>

					<Typography.Paragraph className={styles.goal} ellipsis={{ rows: 2 }}>
						{checkpoint.goal ||
							t("checkpoints.goal.empty", "The goal is not written yet")}
					</Typography.Paragraph>

					{checkpoint.day !== null && (
						<Typography.Text className={styles.day}>
							{t("checkpoints.status.day", "Day {day} of 28", {
								day: Math.min(checkpoint.day, CHECKPOINT_DAYS),
							})}
						</Typography.Text>
					)}
				</Flex>

				<Flex gap={8} align="center" className={styles.actions}>
					{answerable ? (
						<Button type="primary" onClick={() => setBriefOpen(true)}>
							{t("advisor.brief.review", "Review and answer")}
						</Button>
					) : (
						<>
							<Button type="link" onClick={() => setBriefOpen(true)}>
								{t("advisor.brief.open", "Details")}
							</Button>
							<Link href={`/advisor/checkpoints/${checkpoint.id}`}>
								<Button>{t("checkpoints.open", "Open checkpoint")}</Button>
							</Link>
						</>
					)}
				</Flex>
			</Flex>

			<CheckpointCardModal
				checkpoint={checkpoint}
				open={briefOpen}
				onClose={() => setBriefOpen(false)}
				answerable={answerable}
			/>
		</section>
	);
}
