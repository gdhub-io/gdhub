"use client";

import { IconGavel, IconNotebook, IconPhoneCall } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Timeline, Typography } from "antd";
import dayjs from "dayjs";
import {
	HeadlineCard,
	Section,
} from "@/components/scout/ProjectCardModal/parts";
import scout from "@/components/scout/ProjectCardModal/style.module.scss";
import {
	CHECKPOINT_DAYS,
	SPRINT_DAYS,
	SPRINTS_PER_CHECKPOINT,
} from "@/config/checkpoint";
import {
	type CheckpointPlanStep,
	checkpointPlan,
	dateOfDay,
	VERDICT_DAY,
} from "@/lib/checkpoint-plan";
import { sprintDayRange } from "@/lib/checkpoint-sprints";
import type { AdvisorCheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

const { Text } = Typography;

/** A call runs 45 minutes — `docs/checkpoint-standard.md` §3. */
const CALL_MINUTES = 45;

const ICON = {
	call: IconPhoneCall,
	devlog: IconNotebook,
	verdict: IconGavel,
} as const;

/**
 * What the curator is signing up for: five calls, the four sprints they open,
 * the devlogs to read before each, and the day the verdict is owed. Dated from
 * the day the author picked; before that, counted in days.
 */
export function PlanTab({ checkpoint }: { checkpoint: AdvisorCheckpointDto }) {
	const { t } = useTranslate();
	const { startedAt } = checkpoint;

	const when = (day: number, format = "ddd, D MMM") =>
		startedAt
			? dayjs.utc(dateOfDay(startedAt, day)).format(format)
			: t("advisor.plan.day", "Day {day}", { day });

	const sprintDates = (sprint: number) => {
		const { firstDay, lastDay } = sprintDayRange(sprint);

		return `${when(firstDay, "D MMM")} – ${when(lastDay, "D MMM")}`;
	};

	const calls = [
		t(
			"advisor.plan.call1",
			"The goal — cut the outcome list to what 28 days can hold, and fix the card.",
		),
		t(
			"advisor.plan.call2",
			"Risks — what is already in the way, and what to do about it.",
		),
		t("advisor.plan.call3", "Scope — the one day the outcome list may change."),
		t("advisor.plan.call4", "The run-in — what has to be true by day 28."),
		t(
			"advisor.plan.call5",
			"The result — the team shows what exists; you say whether it is reached, and why.",
		),
	];

	const describe = (step: CheckpointPlanStep) => {
		if (step.kind === "call") {
			return {
				title: step.sprint
					? t("advisor.plan.callOpens", "Call {n} · opens sprint {sprint}", {
							n: step.call,
							sprint: step.sprint,
						})
					: t("advisor.plan.callLast", "Call {n}", { n: step.call }),
				body: calls[step.call - 1],
				meta: step.sprint
					? t("advisor.plan.sprintRuns", "Sprint {sprint} runs {dates}", {
							sprint: step.sprint,
							dates: sprintDates(step.sprint),
						})
					: null,
			};
		}

		if (step.kind === "devlog") {
			return {
				title: t(
					"advisor.plan.devlog",
					"Devlog and artifacts for sprint {sprint}",
					{
						sprint: step.sprint,
					},
				),
				body: t(
					"advisor.plan.devlogBody",
					"The team publishes it, and the author may attach artifacts. Read both before the call — they are what the call is about.",
				),
				meta: null,
			};
		}

		return {
			title: t("advisor.plan.verdict", "Verdict"),
			body: t(
				"advisor.plan.verdictBody",
				"The result card and the verdict, written on the platform.",
			),
			meta: null,
		};
	};

	return (
		<Flex vertical gap={16}>
			<div className={scout.headline}>
				<HeadlineCard
					label={t("advisor.plan.calls", "Calls")}
					value={t("advisor.plan.callsValue", "{count} × {minutes} min", {
						count: SPRINTS_PER_CHECKPOINT + 1,
						minutes: CALL_MINUTES,
					})}
					sub={t(
						"advisor.plan.callsSub",
						"With the author and up to four of the team",
					)}
				/>
				<HeadlineCard
					label={t("advisor.plan.sprints", "Sprints")}
					value={t("advisor.plan.sprintsValue", "{count} × {days} days", {
						count: SPRINTS_PER_CHECKPOINT,
						days: SPRINT_DAYS,
					})}
					sub={`${when(1, "D MMM")} – ${when(CHECKPOINT_DAYS, "D MMM YYYY")}`}
				/>
				<HeadlineCard
					label={t("advisor.plan.verdictDue", "Verdict due")}
					value={when(VERDICT_DAY, "D MMM")}
					sub={t("advisor.plan.verdictSub", "Day {day}", { day: VERDICT_DAY })}
				/>
			</div>

			<Section title={t("advisor.plan.title", "Your plan")} loading={false}>
				<Timeline
					className={styles.plan}
					titleSpan="136px"
					items={checkpointPlan().map((step) => {
						const { title, body, meta } = describe(step);
						const Icon = ICON[step.kind];

						return {
							key: `${step.kind}-${step.day}`,
							icon: <Icon size={16} className={styles.planIcon} />,
							title: (
								<Flex vertical className={styles.planWhen}>
									<Text strong>{when(step.day)}</Text>
									{startedAt && (
										<Text type="secondary" className={scout.summarySub}>
											{t("advisor.plan.day", "Day {day}", { day: step.day })}
										</Text>
									)}
								</Flex>
							),
							content: (
								<Flex vertical gap={4}>
									<Text strong>{title}</Text>
									<Text type="secondary">{body}</Text>
									{meta && <Text className={scout.summarySub}>{meta}</Text>}
								</Flex>
							),
						};
					})}
				/>
			</Section>
		</Flex>
	);
}
