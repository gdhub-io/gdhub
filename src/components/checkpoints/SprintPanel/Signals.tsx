"use client";

import { IconUsers } from "@tabler/icons-react";
import { type TFnType, useTranslate } from "@tolgee/react";
import { Card, Flex, Tooltip, Typography } from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import { PulseCell } from "@/components/checkpoints/PulseCell";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
	CheckpointDto,
	CheckpointPulseCellDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";
import styles from "./style.module.scss";

/** What a pulse cell says on hover — the same words wherever the matrix is drawn. */
export const pulseCellLabel = (
	t: TFnType,
	cell: CheckpointPulseCellDto | undefined,
) => {
	if (!cell || cell.state === "notOnTeam")
		return t("checkpoints.signals.legend.notOnTeam", "Not on the team");
	if (cell.state === "confirmed")
		return t("checkpoints.signals.marked", "Marked {date}", {
			date: dayjs(cell.confirmedAt).format("D MMM"),
		});
	if (cell.state === "missed")
		return t("checkpoints.signals.legend.missed", "Missed");
	if (cell.state === "waiting")
		return t("checkpoints.signals.legend.waiting", "Waiting");

	return t("checkpoints.signals.legend.notAsked", "Not asked yet");
};

export type SignalsProps = {
	checkpoint: CheckpointDto;
	sprint: CheckpointSprintDto;
};

/**
 * The matrix, and nothing above it: the per-member list that used to sit here
 * was the same data written out twice. A cell says its date on hover.
 */
export function Signals({ checkpoint, sprint }: SignalsProps) {
	const { t } = useTranslate();
	const sprints = checkpoint.sprints ?? [];
	const rows = checkpoint.pulses ?? [];

	if (!rows.length)
		return (
			<EmptyState
				icon={IconUsers}
				title={t("checkpoints.signals.empty", "No one has been asked yet")}
				description={t(
					"checkpoints.signals.emptyNote",
					"Every member is asked once a sprint, and work already published answers for them.",
				)}
			/>
		);

	return (
		<Card
			size="small"
			styles={{ body: { padding: 0 } }}
			title={
				<span className={styles.cardTitle}>
					{t("checkpoints.signals.title", "Team signals")}
				</span>
			}
			extra={
				<Typography.Text type="secondary" className={styles.cardMeta}>
					{t(
						"checkpoints.signals.info",
						"One press per person per sprint. Hover a cell for the day it was marked.",
					)}
				</Typography.Text>
			}
		>
			<div className={styles.matrix}>
				<Flex gap={8} align="center" className={styles.matrixHead}>
					<span className={styles.person}>
						{t("checkpoints.signals.team", "TEAM")}
					</span>
					{sprints.map((item) => (
						<span
							key={item.number}
							className={clsx(
								styles.col,
								item.number === sprint.number && styles.colCurrent,
							)}
						>
							<span className={styles.colName}>
								{t("checkpoints.signals.sprintShort", "S{n}", {
									n: item.number,
								})}
							</span>
							<span className={styles.colDates}>
								{`${dayjs.utc(item.from).format("D")}–${dayjs.utc(item.to).format("D MMM")}`}
							</span>
						</span>
					))}
				</Flex>

				{rows.map((row) => (
					<Flex
						key={row.memberId}
						gap={8}
						align="center"
						className={styles.matrixRow}
					>
						<Flex gap={12} align="center" className={styles.person}>
							<AppAvatar src={row.image} size={28}>
								{row.name?.slice(0, 1).toUpperCase()}
							</AppAvatar>
							<Flex vertical gap={4} className={styles.personText}>
								<Typography.Text className={styles.personName} ellipsis>
									{row.name}
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className={styles.personRole}
									ellipsis
								>
									{row.role}
								</Typography.Text>
							</Flex>
						</Flex>

						{sprints.map((item) => {
							const cell = row.cells.find((one) => one.sprint === item.number);

							return (
								<span key={item.number} className={styles.col}>
									<Tooltip title={pulseCellLabel(t, cell)}>
										<PulseCell
											state={cell?.state}
											current={item.number === sprint.number}
										/>
									</Tooltip>
								</span>
							);
						})}
					</Flex>
				))}
			</div>
		</Card>
	);
}
