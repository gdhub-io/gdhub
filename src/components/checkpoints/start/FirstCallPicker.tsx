"use client";

import {
	IconCalendarEvent,
	IconChevronLeft,
	IconChevronRight,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Skeleton, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { SESSIONS_PER_CHECKPOINT, SPRINT_DAYS } from "@/config/checkpoint";
import { useFirstCalls } from "@/hooks/advisor-availability";
import styles from "./FirstCallPicker.module.scss";

export type FirstCallPickerProps = {
	curatorId: string;
	curatorName: string;
	/** The curator's earliest free series, where the strip opens. */
	earliest: string;
	/** The picked first call, ISO. */
	value: string | null;
	onChange: (value: string) => void;
};

const weekOf = (date: Dayjs) =>
	date.startOf("day").subtract((date.day() + 6) % 7, "day");

/**
 * Frame 04 (`Ha8mK`): the first call, picked from the curator's free hours —
 * a week strip, the hours of the chosen day, and the five calls it books. Each
 * hour offered opens five free weekly calls; the server worked that out.
 */
export function FirstCallPicker({
	curatorId,
	curatorName,
	earliest,
	value,
	onChange,
}: FirstCallPickerProps) {
	const { t } = useTranslate();
	const zone = useMemo(
		() => Intl.DateTimeFormat().resolvedOptions().timeZone,
		[],
	);
	const first = weekOf(dayjs(earliest));
	const [week, setWeek] = useState(() => weekOf(dayjs(value ?? earliest)));
	const [day, setDay] = useState<string | null>(
		value ? dayjs(value).format("YYYY-MM-DD") : null,
	);

	// A day either side: the curator's days and the author's are not the same days.
	const { data, isLoading } = useFirstCalls(
		curatorId,
		week.subtract(1, "day").format("YYYY-MM-DD"),
		week.add(7, "day").format("YYYY-MM-DD"),
	);

	const byDay = useMemo(() => {
		const map = new Map<string, string[]>();
		for (const start of data?.starts ?? []) {
			const key = dayjs(start).format("YYYY-MM-DD");
			map.set(key, [...(map.get(key) ?? []), start]);
		}
		return map;
	}, [data]);

	const days = Array.from({ length: 7 }, (_, offset) =>
		week.add(offset, "day"),
	);
	const firstOpen = days.find((date) => byDay.has(date.format("YYYY-MM-DD")));

	// The strip opens on the first day with hours when nothing is picked in it.
	const shown =
		day && days.some((date) => date.format("YYYY-MM-DD") === day)
			? day
			: (firstOpen?.format("YYYY-MM-DD") ?? null);

	const times = shown ? (byDay.get(shown) ?? []) : [];
	const calls = value
		? Array.from({ length: SESSIONS_PER_CHECKPOINT }, (_, index) =>
				dayjs(value).add(index * SPRINT_DAYS, "day"),
			)
		: [];

	return (
		<Flex vertical gap={12}>
			<Flex justify="space-between" align="end">
				<Typography.Text className={styles.label}>
					{t("checkpoints.firstCall.label", "First call with {name}", {
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
				<Flex gap={8} align="center">
					<Button
						icon={<IconChevronLeft size={16} />}
						disabled={!week.isAfter(first, "day")}
						onClick={() => setWeek(week.subtract(7, "day"))}
						aria-label={t("checkpoints.firstCall.prev", "Previous week")}
					/>
					{days.map((date) => {
						const key = date.format("YYYY-MM-DD");
						const count = byDay.get(key)?.length ?? 0;
						return (
							<Button
								key={key}
								className={styles.day}
								type={key === shown ? "primary" : "default"}
								disabled={!count}
								onClick={() => setDay(key)}
							>
								<span className={styles.weekday}>{date.format("ddd")}</span>
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
					<Button
						icon={<IconChevronRight size={16} />}
						onClick={() => setWeek(week.add(7, "day"))}
						aria-label={t("checkpoints.firstCall.next", "Next week")}
					/>
				</Flex>

				{isLoading ? (
					<Skeleton.Button active />
				) : times.length > 0 ? (
					<Flex gap={8} wrap>
						{times.map((start) => (
							<Button
								key={start}
								type={start === value ? "primary" : "default"}
								onClick={() => onChange(start)}
							>
								{dayjs(start).format("HH:mm")}
							</Button>
						))}
					</Flex>
				) : (
					<Typography.Text type="secondary">
						{t(
							"checkpoints.firstCall.noneThisWeek",
							"No free hours this week — try the next one.",
						)}
					</Typography.Text>
				)}

				{calls.length > 0 && (
					<Flex gap={12} align="center" className={styles.summary}>
						<IconCalendarEvent size={16} className={styles.summaryIcon} />
						<Flex vertical gap={4}>
							<Typography.Text strong>
								{t(
									"checkpoints.firstCall.summary",
									"{weekday}s at {time} · {from} – {to}",
									{
										weekday: calls[0].format("dddd"),
										time: calls[0].format("HH:mm"),
										from: calls[0].format("D MMM"),
										to: calls[calls.length - 1].format("D MMM"),
									},
								)}
							</Typography.Text>
							<Typography.Text type="secondary" className={styles.small}>
								{t(
									"checkpoints.firstCall.summaryNote",
									"Call 1 plans the checkpoint on {first}; calls 2–5 follow on {rest}. Any call can be moved later.",
									{
										first: calls[0].format("D MMM"),
										rest: calls
											.slice(1)
											.map((call) => call.format("D MMM"))
											.join(", "),
									},
								)}
							</Typography.Text>
						</Flex>
					</Flex>
				)}
			</Flex>
		</Flex>
	);
}
