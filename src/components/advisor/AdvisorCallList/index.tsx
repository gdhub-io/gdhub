"use client";

import { IconVideo } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import Link from "next/link";
import { IconTile } from "@/components/ui";
import { FINAL_SESSION, SESSION_MINUTES } from "@/config/checkpoint";
import type { AdvisorCalendar } from "@/repositories/advisor/availability";
import styles from "./style.module.scss";

type Call = AdvisorCalendar["upcoming"][number];

export type AdvisorCallListProps = {
	calls: Call[];
	timeZone: string;
	/** Upcoming calls can be joined on their day; past ones only say when they were. */
	upcoming: boolean;
	/** Already-translated, shown when there are no calls. */
	emptyText: string;
	/** Fixed in stories so "Today" and "in 2 hours" stay put. */
	now?: Date;
};

const groupByDay = (calls: Call[], timeZone: string) => {
	const days = new Map<string, { day: Dayjs; calls: Call[] }>();

	for (const call of calls) {
		const start = dayjs(call.scheduledAt).tz(timeZone);
		const key = start.format("YYYY-MM-DD");
		const group = days.get(key) ?? { day: start, calls: [] };
		group.calls.push(call);
		days.set(key, group);
	}

	return [...days.entries()];
};

/** Calls booked with an advisor, grouped by their day in the advisor's zone. */
export function AdvisorCallList({
	calls,
	timeZone,
	upcoming,
	emptyText,
	now = new Date(),
}: AdvisorCallListProps) {
	const { t } = useTranslate();
	const today = dayjs(now).tz(timeZone);

	return (
		<div className={styles.card}>
			{calls.length === 0 ? (
				<Typography.Text type="secondary" className={styles.empty}>
					{emptyText}
				</Typography.Text>
			) : (
				groupByDay(calls, timeZone).map(([key, group]) => {
					const date = group.day.format("dddd D MMMM");
					const isToday = group.day.isSame(today, "day");

					return (
						<div key={key}>
							<div className={styles.day}>
								{isToday
									? t("advisor.calendar.today", "Today · {date}", { date })
									: date}
							</div>
							{group.calls.map((call) => {
								const start = dayjs(call.scheduledAt).tz(timeZone);
								const end = start.add(SESSION_MINUTES, "minute");

								return (
									<Flex
										key={call.sessionId}
										align="center"
										gap={12}
										className={styles.row}
									>
										<Typography.Text className={styles.time}>
											{`${start.format("HH:mm")} – ${end.format("HH:mm")}`}
										</Typography.Text>
										<IconTile icon={IconVideo} size="sm" />
										<Flex vertical className={styles.text}>
											<Typography.Text strong ellipsis>
												{t(
													"advisor.calendar.callTitle",
													"Call {index} · {project}",
													{ index: call.index, project: call.projectName },
												)}
											</Typography.Text>
											<Typography.Text type="secondary">
												{call.index === FINAL_SESSION
													? t(
															"advisor.calendar.finalCall",
															"The final call — your verdict follows",
														)
													: t(
															"advisor.calendar.checkpointCall",
															"Checkpoint call",
														)}
											</Typography.Text>
										</Flex>
										{upcoming && isToday ? (
											<Link
												href={`/advisor/checkpoints/${call.checkpointId}/review/${call.index}`}
											>
												<Button type="primary">
													{t("advisor.calendar.join", "Join")}
												</Button>
											</Link>
										) : (
											<Typography.Text type="secondary" className={styles.when}>
												{start.from(today)}
											</Typography.Text>
										)}
									</Flex>
								);
							})}
						</div>
					);
				})
			)}
		</div>
	);
}

export default AdvisorCallList;
