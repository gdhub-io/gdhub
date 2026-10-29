"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { PulseCell } from "@/components/checkpoints/PulseCell";
import { pulseCellLabel } from "@/components/checkpoints/SprintPanel/Signals";
import { specialityLine } from "@/components/scout/ProjectCardModal/format";
import { Section } from "@/components/scout/ProjectCardModal/parts";
import styles from "@/components/scout/ProjectCardModal/style.module.scss";
import { duration } from "@/helpers/investment";
import { hoursSpan } from "@/lib/checkpoints/capacity";
import type { AdvisorProjectDto } from "@/types/checkpoints";

const { Text } = Typography;

type Member = AdvisorProjectDto["team"][number];

/**
 * The scout's Team tab with the people taken out — what each seat is, not who —
 * and the checkpoint's weekly pulse beside it, one column a sprint.
 */
export function TeamTab({ project }: { project: AdvisorProjectDto }) {
	const { t } = useTranslate();
	const { author, capacity, sprints, team } = project;

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
					<PulseCell state={cell?.state} current={sprint.state === "current"} />
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
									{[
										specialityLine(member.speciality) ?? "—",
										member.isFounder && author?.timezone,
									]
										.filter(Boolean)
										.join(" · ")}
								</Text>
								{member.isFounder && author?.experience && (
									<Text type="secondary" className={styles.summarySub}>
										{author.experience}
									</Text>
								)}
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
