"use client";

import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { IconTile } from "@/components/ui";
import { CheckpointStatus } from "@/config/prisma-enums";
import { useAnswerCheckpoint } from "@/hooks/checkpoints";
import type { AdvisorCheckpoint } from "@/repositories/advisor-checkpoints";
import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";
import styles from "./style.module.scss";

export type AdvisorCheckpointCardProps = {
	checkpoint: AdvisorCheckpoint;
	/** Only the group waiting on an answer carries the two buttons. */
	answerable?: boolean;
};

/**
 * One checkpoint on the advisor's board — frame `F7WRD`.
 *
 * The project comes first because that is what the curator recognises; the
 * checkpoint's own number, stage and dates are the line under it. The goal is
 * quoted in full: it is the thing they are being asked to hold the 28 days to.
 */
export function AdvisorCheckpointCard({
	checkpoint,
	answerable,
}: AdvisorCheckpointCardProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const answer = useAnswerCheckpoint(checkpoint.id);

	const dates =
		checkpoint.startedAt && checkpoint.dueAt
			? `${dayjs(checkpoint.startedAt).format("D MMM")}–${dayjs(checkpoint.dueAt).format("D MMM YYYY")}`
			: null;

	const reply = async (accept: boolean) => {
		try {
			await answer.mutateAsync(accept);
		} catch {
			message.error(
				t("advisor.checkpoints.answerFailed", "The answer was not saved"),
			);
		}
	};

	return (
		<section className={styles.card} data-asked={answerable || undefined}>
			<Flex gap={12} align="flex-start">
				<IconTile icon={IconDeviceGamepad2} size="lg" />

				<Flex vertical gap={6} className={styles.text}>
					<Flex vertical gap={2}>
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
						<>
							<Button
								onClick={() => reply(false)}
								loading={answer.isPending}
								disabled={answer.isPending}
							>
								{t("advisor.checkpoints.decline", "Turn down")}
							</Button>
							<Button
								type="primary"
								onClick={() => reply(true)}
								loading={answer.isPending}
							>
								{t("advisor.checkpoints.accept", "Take it on")}
							</Button>
						</>
					) : (
						<Link
							href={`/user/project/${checkpoint.project.slug}/checkpoints/${checkpoint.id}`}
						>
							<Button>{t("checkpoints.open", "Open checkpoint")}</Button>
						</Link>
					)}
				</Flex>
			</Flex>
		</section>
	);
}
