"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Table, Typography } from "antd";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { teamCapacity } from "@/lib/checkpoint-capacity";
import styles from "./TeamResource.module.scss";
import { type TeamHoursRow, useTeamHours } from "./teamHours";

export type TeamResourceProps = {
	teamId?: string;
	/** The hours to show for a member: the author's own may be mid-edit. */
	hoursOf: (row: TeamHoursRow) => [number, number] | null;
};

/**
 * Frame 03.1 (`GzkPp`): where the team's hours come from, member by member.
 *
 * Read only. Each figure is the member's own statement in their profile; the
 * totals go through `teamCapacity`, the rule the curator is given, so a member
 * who stated nothing is unknown rather than zero.
 */
export function TeamResource({ teamId, hoursOf }: TeamResourceProps) {
	const { t } = useTranslate();
	const { members, isLoading } = useTeamHours(teamId);

	const total = teamCapacity(
		members.map((row) => ({ timeForWork: hoursOf(row) })),
	);
	const span = (from: number, to: number) =>
		from === to ? `${from}` : `${from}–${to}`;
	const run = (row: TeamHoursRow) =>
		teamCapacity([{ timeForWork: hoursOf(row) }]).hoursPerRun;

	return (
		<Table<TeamHoursRow>
			size="middle"
			pagination={false}
			loading={isLoading}
			rowKey="id"
			className={styles.table}
			dataSource={members}
			columns={[
				{
					key: "who",
					title: t("checkpoints.when.teamMember", "Who"),
					render: (_: unknown, row: TeamHoursRow) => (
						<Flex gap={10} align="center">
							<AppAvatar src={row.user.image} size={28}>
								{row.user.name?.slice(0, 2).toUpperCase()}
							</AppAvatar>
							<Flex vertical gap={1}>
								<Typography.Text className={styles.who}>
									{row.user.name}
								</Typography.Text>
								<Typography.Text type="secondary" className={styles.role}>
									{row.speciality?.name ?? row.position}
								</Typography.Text>
							</Flex>
						</Flex>
					),
				},
				{
					key: "week",
					align: "right",
					title: t("checkpoints.when.teamWeek", "Hours / sprint"),
					render: (_: unknown, row: TeamHoursRow) => {
						const hours = hoursOf(row);
						return (
							<Typography.Text type="secondary" className={styles.figure}>
								{hours
									? span(hours[0], hours[1])
									: t("checkpoints.when.teamUnknown", "not stated")}
							</Typography.Text>
						);
					},
				},
				{
					key: "run",
					align: "right",
					title: t("checkpoints.when.teamRun", "Over the 28 days"),
					render: (_: unknown, row: TeamHoursRow) => {
						const hours = run(row);
						return (
							<Typography.Text className={styles.figure}>
								{hours ? span(hours.from, hours.to) : "—"}
							</Typography.Text>
						);
					},
				},
			]}
			summary={() => (
				<Table.Summary.Row>
					<Table.Summary.Cell index={0}>
						<Typography.Text strong>
							{total.stated === total.members
								? t("checkpoints.when.teamTotal", "The team")
								: t(
										"checkpoints.when.teamTotalPart",
										"The team — {stated} of {members} stated",
										{ stated: total.stated, members: total.members },
									)}
						</Typography.Text>
					</Table.Summary.Cell>
					<Table.Summary.Cell index={1} align="right">
						<Typography.Text strong className={styles.figure}>
							{total.hoursPerWeek
								? span(total.hoursPerWeek.from, total.hoursPerWeek.to)
								: "—"}
						</Typography.Text>
					</Table.Summary.Cell>
					<Table.Summary.Cell index={2} align="right">
						<Typography.Text strong className={styles.figure}>
							{total.hoursPerRun
								? span(total.hoursPerRun.from, total.hoursPerRun.to)
								: "—"}
						</Typography.Text>
					</Table.Summary.Cell>
				</Table.Summary.Row>
			)}
		/>
	);
}
