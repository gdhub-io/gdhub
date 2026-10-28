"use client";

import {
	IconCalendarPlus,
	IconCalendarRepeat,
	IconChevronDown,
	IconLink,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Dropdown,
	Flex,
	Skeleton,
	Tooltip,
	Typography,
} from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useCalendarApps } from "@/components/checkpoints/AddToCalendar";
import {
	AI_APPROVE_HOURS,
	CALL_OPENS_MINUTES,
	FINAL_SESSION,
	PRO_PLAN_AFTER_CALL_HOURS,
	SCOPE_SESSION,
	SPRINT_DAYS,
} from "@/config/checkpoint";
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
const ROWS = Math.ceil(VERDICT_DAY / SPRINT_DAYS);

export type CheckpointCalendarProps = { checkpointId: string };

/**
 * Frames 12.08.14–15 and 12.10.5: every date of the checkpoint, a sprint a
 * row, so a call always opens its row and a deadline closes it. Sprint days
 * are their own dates (UTC), as the Workflow path shows them; hours are the
 * viewer's.
 */
export function CheckpointCalendar({ checkpointId }: CheckpointCalendarProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const calendarApps = useCalendarApps();
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
				return n === FINAL_SESSION
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

	// What the click on a date says: the day, and the hours when it has them.
	const whenOf = (event: CalendarEvent) => {
		const start = dayjs(event.start);
		if (event.allDay) return dayjs.utc(event.start).format("ddd D MMM");
		// An AI letter is a moment it is ready, not a meeting.
		if (event.kind === "review" || event.kind === "brief")
			return start.format("ddd D MMM, HH:mm");
		const end = start.add(event.minutes ?? 0, "minute");
		return `${start.format("ddd D MMM, HH:mm")} – ${end.format(end.isSame(start, "day") ? "HH:mm" : "ddd D MMM, HH:mm")}`;
	};

	const curator = data.curatorName ?? "";
	const project = data.projectName;
	// What the date asks of whoever reads it, in a sentence or two.
	const whatOf = (event: CalendarEvent) => {
		const n = event.index ?? 0;
		const end = dayjs(event.start)
			.add(event.minutes ?? 0, "minute")
			.format("ddd D MMM, HH:mm");
		switch (event.kind) {
			case "call":
				if (n === 1)
					return team
						? t(
								"checkpoints.calendar.what.call1",
								"Agree the goal and the tasks with {name}. They stay open for {hours} hours after the call, then are fixed.",
								{ name: curator, hours: PRO_PLAN_AFTER_CALL_HOURS },
							)
						: t(
								"checkpoints.calendar.what.call1Curator",
								"Agree the goal and the tasks with {project}. They stay open for {hours} hours after the call.",
								{ project, hours: PRO_PLAN_AFTER_CALL_HOURS },
							);
				if (n === SCOPE_SESSION)
					return t(
						"checkpoints.calendar.what.call3",
						"Opens sprint 3. The tasks can change for the last time: from the call until a day after it.",
					);
				if (n === FINAL_SESSION)
					return team
						? t(
								"checkpoints.calendar.what.call5",
								"The final call: what the checkpoint came to. The verdict follows.",
							)
						: t(
								"checkpoints.calendar.what.call5Curator",
								"The final call. The verdict can be sent from its start.",
							);
				return t(
					"checkpoints.calendar.what.call",
					"Opens sprint {n}: what the last sprint showed and the focus of this one. The room opens {minutes} minutes before.",
					{ n, minutes: CALL_OPENS_MINUTES },
				);
			case "plan":
				return t(
					"checkpoints.calendar.what.plan",
					"Write one to five tasks and send them: the AI curator checks them once. Approve the plan, or it approves itself {hours} hours after the check.",
					{ hours: AI_APPROVE_HOURS },
				);
			case "review":
				return n === FINAL_SESSION
					? t(
							"checkpoints.calendar.what.finalReview",
							"The AI curator reads everything once more and writes the final review and the verdict.",
						)
					: t(
							"checkpoints.calendar.what.review",
							"The AI curator's review of sprint {n} is ready, with the focus of the next one. Read it before you plan the week.",
							{ n: n - 1 },
						);
			case "brief":
				return t(
					"checkpoints.calendar.what.brief",
					"The AI's read of sprint {n}, for you alone, ready before the call.",
					{ n },
				);
			case "deadline":
				return team
					? t(
							"checkpoints.calendar.what.due",
							"By the end of the day: the sprint's devlog, a build or a video of it, and the artifacts that prove its tasks. Answer the pulse too.",
						)
					: t(
							"checkpoints.calendar.what.teamDue",
							"By the end of the day {project} posts the sprint's devlog, build and artifacts.",
							{ project },
						);
			case "change":
				return team
					? t(
							"checkpoints.calendar.what.change",
							"Change the tasks and confirm them by {end} — the last change of the checkpoint.",
							{ end },
						)
					: t(
							"checkpoints.calendar.what.teamChange",
							"{project} may change the tasks until {end}.",
							{ project, end },
						);
			case "evidence":
				return team
					? t(
							"checkpoints.calendar.what.evidence",
							"Attach evidence to every task still without it: the verdict reads it.",
						)
					: t(
							"checkpoints.calendar.what.teamEvidence",
							"{project} is reminded of the tasks still without evidence.",
							{ project },
						);
			case "verdict":
				return team
					? t(
							"checkpoints.calendar.what.verdict",
							"{name}'s verdict on the checkpoint, by the end of the day.",
							{ name: curator },
						)
					: t(
							"checkpoints.calendar.what.verdictDue",
							"Send your verdict by the end of the day.",
						);
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
	const subscribe = [
		...calendarApps({
			google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
			outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(data.feedUrl)}`,
			apple: () => {
				window.location.href = webcal;
			},
		}),
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
										(byDate.get(key) ?? []).map((event) => (
											<Tooltip
												key={event.uid}
												trigger="click"
												title={
													<Flex vertical gap={4}>
														{/* ui-guard-ignore inside the tooltip's dark ground; Typography would recolour the text dark */}
														<strong>{labelOf(event)}</strong>
														<span>{whatOf(event)}</span>
														<span className={styles.tipWhen}>
															{whenOf(event)}
														</span>
													</Flex>
												}
											>
												<span
													className={styles.chip}
													data-tone={TONE[event.kind]}
												>
													{labelOf(event)}
												</span>
											</Tooltip>
										))}
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
