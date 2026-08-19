"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Table, Tag, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { StatusDot } from "@/components/ui/StatusDot";
import { duration } from "@/helpers/investment";
import { specialityLine } from "../format";
import { KycBadge, Person, Section } from "../parts";
import styles from "../style.module.scss";
import type { CardMember } from "../types";
import { useCardSection } from "../useSection";

const { Text } = Typography;

export function TeamTab({ projectId }: { projectId: string }) {
	const { t } = useTranslate();
	const { data, isLoading } = useCardSection<CardMember[]>(projectId, "team");

	const commitment = (member: CardMember) => {
		const range = member.hoursPerWeek;
		if (!range?.length) return "—";

		const [min, max = min] = range;

		return t("scout.card.team.hours", "{min}–{max} h/week", { min, max });
	};

	return (
		<Flex vertical gap={24}>
			<Section
				title={t("scout.card.team.title", "Members")}
				count={data?.length}
				loading={isLoading}
				rows={4}
			>
				<Table
					rowKey="id"
					size="small"
					pagination={false}
					className={styles.cardTable}
					dataSource={data ?? []}
					scroll={{ x: 840 }}
					columns={[
						{
							title: t("scout.card.team.member", "Team member"),
							key: "member",
							render: (_: unknown, member: CardMember) => (
								<Person
									size={40}
									name={member.name}
									image={member.image}
									caption={specialityLine(member.speciality)}
								/>
							),
						},
						{
							title: t("scout.card.team.position", "Position"),
							key: "position",
							width: 224,
							render: (_: unknown, member: CardMember) => (
								<Flex align="center" gap={8}>
									<Text ellipsis>{member.position ?? "—"}</Text>
									{member.isFounder && (
										<Tag>{t("scout.card.team.founder", "Founder")}</Tag>
									)}
								</Flex>
							),
						},
						{
							title: t("scout.card.team.status", "Status"),
							key: "status",
							width: 128,
							render: (_: unknown, member: CardMember) =>
								member.finishedAt ? (
									<StatusDot
										tone="neutral"
										label={t("scout.card.team.left", "Left")}
									/>
								) : (
									<StatusDot
										tone="success"
										label={t("scout.card.team.active", "Active")}
									/>
								),
						},
						{
							title: t("scout.card.team.commitment", "Commitment"),
							key: "commitment",
							width: 152,
							render: (_: unknown, member: CardMember) => commitment(member),
						},
						{
							title: t("scout.card.team.kyc", "KYC"),
							key: "kyc",
							width: 152,
							render: () => <KycBadge />,
						},
						{
							title: t("scout.card.team.tenure", "On the project"),
							key: "tenure",
							width: 152,
							render: (_: unknown, member: CardMember) => (
								<Tooltip
									title={t(
										"scout.card.team.tenureRange",
										"from {from} to {to}",
										{
											from: dayjs(member.startedAt).format("DD.MM.YYYY"),
											to: member.finishedAt
												? dayjs(member.finishedAt).format("DD.MM.YYYY")
												: t("scout.card.team.present", "present"),
										},
									)}
								>
									<span className={styles.nowrap}>
										{duration(
											Math.max(
												1,
												dayjs(member.finishedAt ?? undefined).diff(
													member.startedAt,
													"month",
												),
											),
											t,
										)}
									</span>
								</Tooltip>
							),
						},
					]}
				/>
			</Section>
		</Flex>
	);
}
