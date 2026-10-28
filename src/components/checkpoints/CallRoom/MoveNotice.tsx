"use client";

import { IconCalendarTime } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Typography } from "antd";
import dayjs from "dayjs";
import { useCallMove } from "@/hooks/checkpoint-call";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import styles from "./style.module.scss";

/**
 * Frames 12.08.12 (asked: take it back) and 12.08.13 (asked of you: move it or
 * keep the time). The old time stands until the other side answers.
 */
export function MoveNotice({
	call,
	otherSide,
}: {
	call: Pick<
		CheckpointCallDto,
		"checkpointId" | "index" | "scheduledAt" | "move"
	>;
	/** Who answers a request of the viewer's: the curator's first name, or the team. */
	otherSide: string;
}) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { answer, withdraw } = useCallMove(call.checkpointId, call.index);
	if (!call.move) return null;

	const to = dayjs(call.move.to);
	const old = dayjs(call.scheduledAt);
	const fail = () =>
		message.error(
			t("checkpoints.move.answerFailed", "That did not go through"),
		);

	return (
		<Flex gap={12} align="center" className={styles.moveNotice}>
			<IconCalendarTime size={16} className={styles.moveNoticeIcon} />
			<Flex vertical gap={4} flex={1}>
				<Typography.Text strong>
					{call.move.mine
						? t(
								"checkpoints.move.askedTitle",
								"You asked to move this call to {when}",
								{ when: to.format("dddd D MMM, HH:mm") },
							)
						: t(
								"checkpoints.move.askedOfYouTitle",
								"{name} asks to move this call to {when}",
								{
									name: call.move.askerName,
									when: to.format("dddd D MMM, HH:mm"),
								},
							)}
				</Typography.Text>
				<Typography.Text type="secondary">
					{call.move.mine
						? t(
								"checkpoints.move.askedNote",
								"{name} answers. Until then it stays on {old}.",
								{ name: otherSide, old: old.format("dddd D MMM, HH:mm") },
							)
						: t(
								"checkpoints.move.askedOfYouNote",
								"Until you answer, the call stays on {old}.",
								{ old: old.format("dddd D MMM, HH:mm") },
							)}
				</Typography.Text>
			</Flex>
			{call.move.mine ? (
				<Button
					loading={withdraw.isPending}
					onClick={() => withdraw.mutate(undefined, { onError: fail })}
				>
					{t("checkpoints.move.withdraw", "Withdraw")}
				</Button>
			) : (
				<Flex gap={8}>
					<Button
						type="primary"
						loading={answer.isPending && answer.variables === true}
						disabled={answer.isPending}
						onClick={() =>
							answer.mutate(true, {
								onError: () =>
									message.error(
										t(
											"checkpoints.move.takenSince",
											"That hour is no longer free; the call keeps its time.",
										),
									),
							})
						}
					>
						{t("checkpoints.move.approve", "Move it")}
					</Button>
					<Button
						loading={answer.isPending && answer.variables === false}
						disabled={answer.isPending}
						onClick={() => answer.mutate(false, { onError: fail })}
					>
						{t("checkpoints.move.keep", "Keep {day}", {
							day: old.format("dddd"),
						})}
					</Button>
				</Flex>
			)}
		</Flex>
	);
}
