import {
	IconCircleCheck,
	IconCircleDashed,
	IconLoader2,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import { SPRINT_DAYS } from "@/lib/checkpoint-sprints";
import type { CheckpointSprintDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

const ICONS = {
	done: IconCircleCheck,
	current: IconLoader2,
	ahead: IconCircleDashed,
} as const;

/** "28 Sep – 4 Oct", or "5 – 11 Oct" when both ends share a month. */
export const dayRange = (from: string, to: string, format = "D MMM") => {
	const start = dayjs.utc(from);
	const end = dayjs.utc(to);

	return `${start.format(start.isSame(end, "month") ? "D" : "D MMM")} – ${end.format(format)}`;
};

/**
 * The four sprints as bars. A sprint's state is the calendar only — how well it
 * went is the verdict's business, so a finished sprint is just finished.
 */
export function SprintTrack({
	sprints,
	day,
}: {
	sprints: CheckpointSprintDto[];
	day: number | null;
}) {
	const { t } = useTranslate();

	return (
		<Flex gap={12}>
			{sprints.map((sprint) => {
				const Icon = ICONS[sprint.state];
				const dayInSprint = Math.min(
					Math.max((day ?? sprint.firstDay) - sprint.firstDay + 1, 1),
					SPRINT_DAYS,
				);

				return (
					<Flex key={sprint.number} vertical gap={10} className={styles.sprint}>
						{/* ui-guard-ignore a two-part bar with a striped remainder; antd Progress draws one fill */}
						<div className={clsx(styles.bar, styles[sprint.state])}>
							{sprint.state === "current" && (
								<div
									className={styles.barFill}
									style={{ width: `${(dayInSprint / SPRINT_DAYS) * 100}%` }}
								/>
							)}
						</div>
						<Flex gap={8} align="flex-start">
							<Icon
								size={18}
								stroke={1.8}
								className={clsx(styles.sprintIcon, styles[sprint.state])}
							/>
							<Flex vertical gap={2}>
								<Flex gap={6} align="baseline" wrap>
									<Typography.Text strong className={styles.sprintName}>
										{t("checkpoints.card.sprint", "Sprint {n}", {
											n: sprint.number,
										})}
									</Typography.Text>
									<Typography.Text className={styles.muted}>
										{dayRange(sprint.from, sprint.to)}
									</Typography.Text>
								</Flex>
								<Typography.Text
									className={clsx(styles.sprintState, styles[sprint.state])}
								>
									{sprint.state === "done"
										? t("checkpoints.card.sprintDone", "Finished")
										: sprint.state === "current"
											? t(
													"checkpoints.card.sprintCurrent",
													"In progress · day {day} of {total}",
													{ day: dayInSprint, total: SPRINT_DAYS },
												)
											: t("checkpoints.card.sprintAhead", "Not started")}
								</Typography.Text>
							</Flex>
						</Flex>
					</Flex>
				);
			})}
		</Flex>
	);
}
