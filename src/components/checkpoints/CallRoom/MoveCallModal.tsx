"use client";

import { IconCalendarEvent } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Modal, Skeleton, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useState } from "react";
import styles from "@/components/checkpoints/start/FirstCallPicker.module.scss";
import { useCallMove, useCallMoveOptions } from "@/hooks/checkpoint-call";

dayjs.extend(utc);

export type MoveCallModalProps = {
	checkpointId: string;
	index: number;
	/** Who answers: the curator's first name, or the team. */
	otherSide: string;
	/** The curator's name for "{name}'s free hours". */
	curatorName: string;
	open: boolean;
	onClose: () => void;
};

/**
 * Frame 12.08.11: one call moved within days 1–3 of its sprint, to one of the
 * curator's free hours. The request waits for the other side; the old time
 * stands until then.
 */
export function MoveCallModal({
	checkpointId,
	index,
	otherSide,
	curatorName,
	open,
	onClose,
}: MoveCallModalProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const { data, isLoading } = useCallMoveOptions(checkpointId, index, open);
	const { ask } = useCallMove(checkpointId, index);
	const [picked, setPicked] = useState<string | null>(null);
	const [day, setDay] = useState<string | null>(null);

	const days = data?.days ?? [];
	const shown =
		days.find((each) => each.date === day) ??
		days.find((each) => each.slots.length > 0);
	const pickedDay = days.find((each) => each.slots.includes(picked ?? ""));

	const send = () => {
		if (!picked) return;
		ask.mutate(picked, {
			onSuccess: onClose,
			onError: (error) =>
				message.error(
					axios.isAxiosError(error) &&
						(error.response?.data as { error?: string })?.error === "slotTaken"
						? t(
								"checkpoints.move.taken",
								"That hour was just taken. Pick another one.",
							)
						: t("checkpoints.move.failed", "The request could not be sent"),
				),
		});
	};

	const scheduled = data ? dayjs(data.scheduledAt) : null;
	// Sprint days are their own dates (UTC), as the Workflow path shows them.
	const dateOf = (date: string) => dayjs.utc(date);

	return (
		<Modal
			open={open}
			centered
			destroyOnHidden
			width={680}
			onCancel={onClose}
			title={t("checkpoints.move.title", "Move call {index}", { index })}
			footer={
				<Flex justify="end" gap={8}>
					<Button onClick={onClose}>{t("common.cancel", "Cancel")}</Button>
					<Button
						type="primary"
						disabled={!picked}
						loading={ask.isPending}
						onClick={send}
					>
						{t("checkpoints.move.ask", "Ask {name} to move it", {
							name: otherSide,
						})}
					</Button>
				</Flex>
			}
		>
			<Flex vertical gap={16}>
				{scheduled && days.length > 0 && (
					<Typography.Text type="secondary">
						{t(
							"checkpoints.move.lead",
							"Now {when}. A call opens its sprint, so it can be any time in the sprint's first {count} days: {from} – {to}.",
							{
								when: scheduled.format("dddd D MMM, HH:mm"),
								count: days.length,
								from: dateOf(days[0].date).format("D MMM"),
								to: dateOf(days[days.length - 1].date).format("D MMM"),
							},
						)}
					</Typography.Text>
				)}

				<Flex justify="space-between" align="end">
					<Typography.Text className={styles.label}>
						{t("checkpoints.move.hours", "{name}'s free hours", {
							name: curatorName,
						})}
					</Typography.Text>
					<Typography.Text type="secondary" className={styles.zone}>
						{t("checkpoints.firstCall.zone", "Times in your zone · {zone}", {
							zone,
						})}
					</Typography.Text>
				</Flex>

				<Flex vertical gap={16} className={styles.box}>
					{isLoading ? (
						<Skeleton active paragraph={{ rows: 2 }} />
					) : (
						<>
							<Flex gap={8}>
								{days.map((each) => {
									const date = dateOf(each.date);
									const count = each.slots.length;
									return (
										<Button
											key={each.date}
											className={styles.day}
											type={each === shown ? "primary" : "default"}
											disabled={!count}
											onClick={() => setDay(each.date)}
										>
											<span className={styles.weekday}>
												{date.format("ddd")}
											</span>
											<span className={styles.date}>{date.format("D")}</span>
											<span className={styles.count}>
												{count
													? t(
															"checkpoints.firstCall.slots",
															"{count, plural, one {# slot} other {# slots}}",
															{ count },
														)
													: "—"}
											</span>
										</Button>
									);
								})}
							</Flex>

							{shown ? (
								<Flex gap={8} wrap>
									{shown.slots.map((slot) => (
										<Button
											key={slot}
											type={slot === picked ? "primary" : "default"}
											onClick={() => setPicked(slot)}
										>
											{dayjs(slot).format("HH:mm")}
										</Button>
									))}
								</Flex>
							) : (
								<Typography.Text type="secondary">
									{t(
										"checkpoints.move.none",
										"{name} has no free hours in these days. Message them to find a time.",
										{ name: curatorName },
									)}
								</Typography.Text>
							)}

							{picked && pickedDay && (
								<Flex gap={12} align="center" className={styles.summary}>
									<IconCalendarEvent size={16} className={styles.summaryIcon} />
									<Flex vertical gap={4}>
										<Typography.Text strong>
											{t(
												"checkpoints.move.summary",
												"{when} — day {day} of the sprint",
												{
													when: dayjs(picked).format("dddd D MMM, HH:mm"),
													day: pickedDay.sprintDay,
												},
											)}
										</Typography.Text>
										<Typography.Text type="secondary" className={styles.small}>
											{t(
												"checkpoints.move.summaryNote",
												"Only this call moves; the others keep their days. {name} answers, and until then the call stays on {old}.",
												{
													name: otherSide,
													old: scheduled?.format("dddd D MMM, HH:mm") ?? "",
												},
											)}
										</Typography.Text>
									</Flex>
								</Flex>
							)}
						</>
					)}
				</Flex>
			</Flex>
		</Modal>
	);
}
