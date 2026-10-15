"use client";

import { IconCheck } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import clsx from "clsx";
import dayjs from "dayjs";
import { pulseCellLabel } from "@/components/checkpoints/SprintPanel/Signals";
import pulse from "@/components/checkpoints/SprintPanel/style.module.scss";
import { specialityLine } from "@/components/scout/ProjectCardModal/format";
import { Section } from "@/components/scout/ProjectCardModal/parts";
import styles from "@/components/scout/ProjectCardModal/style.module.scss";
import { duration } from "@/helpers/investment";
import { hoursSpan } from "@/lib/checkpoint-capacity";
import type { AdvisorProjectDto } from "@/types/checkpoints";

const { Text } = Typography;

type Member = AdvisorProjectDto["team"][number];

/**
 * The scout's Team tab with the people taken out — what each seat is, not who —
 * and the checkpoint's weekly pulse beside it, one column a sprint.
 */
export function TeamTab({ project }: { project: AdvisorProjectDto }) {
	const { t } = useTranslate();
	const { capacity, sprints, team } = project;

	const commitment = (member: Member) => {
		const [min, max = min] = member.hoursPerWeek ?? [];

		return min === undefined
			? "—"
			: t("scout.card.team.hours", "{min}–{max} h/week", { min, max });
	};

	const pulseColumns: ColumnsType<Member> = sprints.map((sprint) => ({
		title: (
			<Tooltip
				title={`${dayjs.utc(sprint.from).format("D MMM")} – ${dayjs.utc(sprint.to).format("D MMM")}`}
			>
				{t("checkpoints.signals.sprintShort", "S{n}", { n: sprint.number })}
			</Tooltip>
		),
		key: `s${sprint.number}`,
		width: 56,
		align: "center",
		render: (_: unknown, member: Member) => {
			const cell = member.pulse.find((one) => one.sprint === sprint.number);

			return (
				<Tooltip title={pulseCellLabel(t, cell)}>
					<span
						className={clsx(
							pulse.cell,
							cell && pulse[cell.state],
							sprint.state === "current" && pulse.cellCurrent,
						)}
					>
						{cell?.state === "confirmed" && (
							// A tick under 16px inside a box needs the heavier stroke to read.
							<IconCheck size={14} stroke={2.4} />
						)}
						{cell?.state === "waiting" && <span className={pulse.waitingDot} />}
					</span>
				</Tooltip>
			);
		},
	}));

	return (
		<Section
			title={t("scout.card.team.title", "Members")}
			count={team.length}
			action={
				<Text type="secondary" className={styles.summarySub}>
					{capacity.hoursPerWeek && capacity.hoursPerRun
						? t(
								"advisor.card.teamHours",
								"{week} h a week · {run} h over 28 days",
								{
									week: hoursSpan(capacity.hoursPerWeek),
									run: hoursSpan(capacity.hoursPerRun),
								},
							)
						: t(
								"checkpoints.pay.capacityUnknown",
								"Nobody has stated their hours yet",
							)}
				</Text>
			}
			loading={false}
		>
			<Table<Member>
				rowKey="id"
				size="small"
				pagination={false}
				className={styles.cardTable}
				dataSource={team}
				scroll={{ x: 760 }}
				locale={{
					emptyText: t(
						"advisor.project.teamEmpty",
						"Nobody has joined the team yet.",
					),
				}}
				columns={[
					{
						title: t("advisor.project.role", "Role"),
						key: "role",
						render: (_: unknown, member: Member) => (
							<Flex vertical gap={4}>
								<Flex align="center" gap={8}>
									<Text ellipsis>{member.position ?? "—"}</Text>
									{member.isFounder && (
										<Tag>{t("scout.card.team.founder", "Founder")}</Tag>
									)}
								</Flex>
								<Text type="secondary" className={styles.summarySub} ellipsis>
									{specialityLine(member.speciality) ?? "—"}
								</Text>
							</Flex>
						),
					},
					{
						title: t("scout.card.team.commitment", "Commitment"),
						key: "commitment",
						width: 136,
						render: (_: unknown, member: Member) => commitment(member),
					},
					{
						title: t("scout.card.team.tenure", "On the project"),
						key: "tenure",
						width: 152,
						render: (_: unknown, member: Member) => (
							<Tooltip
								title={t("advisor.card.since", "since {date}", {
									date: dayjs(member.startedAt).format("DD.MM.YYYY"),
								})}
							>
								<span className={styles.nowrap}>
									{duration(
										Math.max(1, dayjs().diff(member.startedAt, "month")),
										t,
									)}
								</span>
							</Tooltip>
						),
					},
					...pulseColumns,
				]}
			/>
		</Section>
	);
}
