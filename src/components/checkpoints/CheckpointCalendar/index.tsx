"use client";

import {
	IconBrandApple,
	IconBrandGoogle,
	IconBrandWindows,
	IconCalendarPlus,
	IconCalendarRepeat,
	IconChevronDown,
	IconLink,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Dropdown, Flex, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { SPRINT_DAYS } from "@/config/checkpoint";
import { useCheckpointCalendar } from "@/hooks/checkpoints";
import { dateOfDay, VERDICT_DAY } from "@/lib/checkpoint-plan";
import type { CheckpointCalendarDto } from "@/repositories/checkpoint-calendar";
import styles from "./style.module.scss";

dayjs.extend(utc);

type CalendarEvent = CheckpointCalendarDto["events"][number];
type Tone = "dark" | "deadline" | "verdict" | "muted";

const TONE: Record<CalendarEvent["kind"], Tone> = {
	call: "dark",
	plan: "dark",
	review: "dark",
	brief: "muted",
	deadline: "deadline",
	change: "muted",
	evidence: "muted",
	verdict: "verdict",
};

/** Four sprints, then the last days to the verdict: five rows of seven. */
const ROWS = 5;

export type CheckpointCalendarProps = {
	checkpointId: string;
	/** Opens a call or a review from its date. */
	onOpen: (index: number) => void;
};

/**
 * Frames 12.08.14–15 and 12.10.5: every date of the checkpoint, a sprint a
 * row, so a call always opens its row and a deadline closes it. Sprint days
 * are their own dates (UTC), as the Workflow path shows them; hours are the
 * viewer's.
 */
export function CheckpointCalendar({
	checkpointId,
	onOpen,
}: CheckpointCalendarProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { data, isLoading } = useCheckpointCalendar(checkpointId);
	if (isLoading || !data) return <Skeleton active paragraph={{ rows: 6 }} />;

	const team = data.as === "team";
	const time = (iso: string) => dayjs(iso).format("HH:mm");
	const labelOf = (event: CalendarEvent) => {
		const n = event.index ?? 0;
		switch (event.kind) {
			case "call":
				return t("checkpoints.calendar.call", "Call {n} · {time}", {
					n,
					time: time(event.start),
				});
			case "plan":
				return t("checkpoints.calendar.plan", "Plan check");
			case "review":
				return n === 5
					? t("checkpoints.calendar.finalReview", "Final review · verdict")
					: t("checkpoints.calendar.review", "Review of sprint {n}", {
							n: n - 1,
						});
			case "brief":
				return t("checkpoints.calendar.brief", "Brief ready");
			case "deadline":
				return team
					? t("checkpoints.calendar.due", "Sprint {n} due", { n })
					: t("checkpoints.calendar.teamDue", "Team's sprint {n} due", { n });
			case "change": {
				const until = dayjs(event.start).add(event.minutes ?? 0, "minute");
				const when = until.isSame(dayjs(event.start), "day")
					? until.format("HH:mm")
					: until.format("ddd HH:mm");
				return team
					? t("checkpoints.calendar.change", "Tasks change until {when}", {
							when,
						})
					: t(
							"checkpoints.calendar.teamChange",
							"Team may change tasks until {when}",
							{ when },
						);
			}
			case "evidence":
				return team
					? t("checkpoints.calendar.evidence", "Evidence missing?")
					: t(
							"checkpoints.calendar.teamEvidence",
							"Team told of missing evidence",
						);
			case "verdict":
				return team
					? t("checkpoints.calendar.verdict", "Verdict")
					: t("checkpoints.calendar.verdictDue", "Verdict due");
		}
	};

	const byDate = new Map<string, CalendarEvent[]>();
	for (const event of data.events) {
		const key = dayjs.utc(event.start).format("YYYY-MM-DD");
		byDate.set(key, [...(byDate.get(key) ?? []), event]);
	}
	const today = dayjs.utc().format("YYYY-MM-DD");
	const day = (n: number) => dayjs.utc(dateOfDay(data.startedAt, n));

	const webcal = data.feedUrl.replace(/^https?:/, "webcal:");
	const openUrl = (url: string) => window.open(url, "_blank", "noopener");
	const subscribe = [
		{
			key: "google",
			icon: <IconBrandGoogle size={16} />,
			label: t("checkpoints.calendar.google", "Google Calendar"),
			onClick: () =>
				openUrl(
					`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
				),
		},
		{
			key: "apple",
			icon: <IconBrandApple size={16} />,
			label: t("checkpoints.calendar.apple", "Apple Calendar"),
			onClick: () => {
				window.location.href = webcal;
			},
		},
		{
			key: "outlook",
			icon: <IconBrandWindows size={16} />,
			label: t("checkpoints.calendar.outlook", "Outlook"),
			onClick: () =>
				openUrl(
					`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(data.feedUrl)}`,
				),
		},
		{ type: "divider" as const },
		{
			key: "copy",
			icon: <IconLink size={16} />,
			label: t("checkpoints.calendar.copy", "Copy the link"),
			extra: t("checkpoints.calendar.copyNote", "Any other app"),
			onClick: () =>
				navigator.clipboard
					.writeText(data.feedUrl)
					.then(() =>
						message.success(t("checkpoints.calendar.copied", "Link copied")),
					),
		},
	];

	const has = (kind: CalendarEvent["kind"]) =>
		data.events.some((event) => event.kind === kind);
	const legend: [Tone, string][] = [
		[
			"dark",
			has("call")
				? t("checkpoints.calendar.legendCall", "Call")
				: t("checkpoints.calendar.legendReview", "AI review"),
		],
		["deadline", t("checkpoints.calendar.legendDeadline", "Sprint deadline")],
		[
			"muted",
			t("checkpoints.calendar.legendOther", "Tasks, briefs, reminders"),
		],
		...(has("verdict")
			? [
					["verdict", t("checkpoints.calendar.legendVerdict", "Verdict")] as [
						Tone,
						string,
					],
				]
			: []),
	];

	return (
		<Flex vertical gap={16}>
			<div className={styles.head}>
				<IconCalendarRepeat size={20} />
				<div className={styles.headText}>
					<Typography.Text strong>
						{t("checkpoints.calendar.title", "Calendar")}
					</Typography.Text>
					<Typography.Text type="secondary">
						{t("checkpoints.calendar.note", "All dates of the checkpoint.")}
					</Typography.Text>
				</div>
				<Dropdown trigger={["click"]} menu={{ items: subscribe }}>
					<Button type="primary" icon={<IconCalendarPlus size={16} />}>
						{t("checkpoints.calendar.subscribe", "Subscribe")}
						<IconChevronDown size={14} />
					</Button>
				</Dropdown>
			</div>

			<div className={styles.grid}>
				<div className={styles.weekday} />
				{Array.from({ length: SPRINT_DAYS }, (_, offset) => (
					<div key={day(1 + offset).format("ddd")} className={styles.weekday}>
						{day(1 + offset).format("ddd")}
					</div>
				))}
				{Array.from({ length: ROWS }, (_, row) => {
					const first = row * SPRINT_DAYS + 1;
					const last = Math.min(first + SPRINT_DAYS - 1, VERDICT_DAY);
					return [
						<div key={`sprint-${first}`} className={styles.sprint}>
							<span className={styles.sprintName}>
								{row < ROWS - 1
									? t("checkpoints.calendar.sprint", "Sprint {n}", {
											n: row + 1,
										})
									: t("checkpoints.calendar.end", "The end")}
							</span>
							<span>
								{day(first).format("D MMM")} – {day(last).format("D MMM")}
							</span>
						</div>,
						...Array.from({ length: SPRINT_DAYS }, (_, offset) => {
							const n = first + offset;
							const date = day(n);
							const key = date.format("YYYY-MM-DD");
							const outside = n > VERDICT_DAY;
							const past = key < today;
							return (
								<div
									key={key}
									className={[
										styles.day,
										outside && styles.outside,
										past && !outside && styles.past,
									]
										.filter(Boolean)
										.join(" ")}
								>
									<span className={styles.date}>
										<span className={key === today ? styles.today : undefined}>
											{date.format("D")}
										</span>
										{(offset === 0 || date.date() === 1) && (
											<span className={styles.month}>{date.format("MMM")}</span>
										)}
									</span>
									{!outside &&
										(byDate.get(key) ?? []).map((event) =>
											TONE[event.kind] === "dark" && event.index ? (
												// ui-guard-ignore a bespoke chip from frame 12.08.14; antd Button imposes its own height and padding
												<button
													key={event.uid}
													type="button"
													className={styles.chip}
													data-tone="dark"
													onClick={() => onOpen(event.index as number)}
												>
													{labelOf(event)}
												</button>
											) : (
												<span
													key={event.uid}
													className={styles.chip}
													data-tone={TONE[event.kind]}
												>
													{labelOf(event)}
												</span>
											),
										)}
								</div>
							);
						}),
					];
				})}
			</div>

			<div className={styles.legend}>
				{legend.map(([tone, label]) => (
					<span key={tone}>
						<span className={styles.swatch} data-tone={tone} />
						{label}
					</span>
				))}
			</div>
		</Flex>
	);
}
