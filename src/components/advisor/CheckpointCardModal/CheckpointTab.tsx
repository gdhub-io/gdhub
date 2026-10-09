"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import dayjs from "dayjs";
import { EvidenceSlot } from "@/components/checkpoints/EvidenceSlot";
import {
	HeadlineCard,
	Section,
} from "@/components/scout/ProjectCardModal/parts";
import scout from "@/components/scout/ProjectCardModal/style.module.scss";
import { CHECKPOINT_DAYS } from "@/config/checkpoint";
import { CheckpointItemKind } from "@/config/prisma-enums";
import { hoursSpan } from "@/lib/checkpoint-capacity";
import type {
	AdvisorCheckpointDto,
	AdvisorProjectDto,
	CheckpointItemDto,
} from "@/types/checkpoints";
import styles from "./style.module.scss";

const { Text, Paragraph } = Typography;

/** Everything the author filled in, read back the way the payment step showed it. */
export function CheckpointTab({
	checkpoint,
	project,
}: {
	checkpoint: AdvisorCheckpointDto;
	project: AdvisorProjectDto;
}) {
	const { t } = useTranslate();
	const { capacity } = project;

	const side = (kind: CheckpointItemKind) =>
		checkpoint.items.filter((item) => item.kind === kind);

	const list = (title: string, rows: CheckpointItemDto[]) => (
		<Section title={title} count={rows.length} loading={false}>
			<div className={scout.detailsCard}>
				{rows.length ? (
					rows.map((item) => (
						<Flex
							key={item.id}
							gap={12}
							align="center"
							justify="space-between"
							className={styles.itemRow}
						>
							<Text
								className={styles.itemText}
								delete={item.cut}
								type={item.cut ? "secondary" : undefined}
							>
								{item.text}
							</Text>
							<EvidenceSlot artifact={item.artifact} />
						</Flex>
					))
				) : (
					<Text type="secondary" className={styles.itemEmpty}>
						{t("checkpoints.goal.sideEmpty", "Nothing listed")}
					</Text>
				)}
			</div>
		</Section>
	);

	return (
		<Flex vertical gap={18}>
			<div className={scout.headline}>
				<HeadlineCard
					label={t("checkpoints.pay.runsIn", "Runs in")}
					value={t("checkpoints.number", "Checkpoint {number}", {
						number: checkpoint.order,
					})}
					sub={checkpoint.stageName}
				/>
				<HeadlineCard
					label={t("advisor.brief.period", "Period")}
					value={
						checkpoint.startedAt && checkpoint.dueAt
							? t("checkpoints.paid.dates", "{from} – {to}", {
									from: dayjs.utc(checkpoint.startedAt).format("D MMM"),
									to: dayjs.utc(checkpoint.dueAt).format("D MMM"),
								})
							: "—"
					}
					muted={!checkpoint.startedAt}
					sub={
						checkpoint.dueAt
							? t("advisor.card.periodSub", "{year} · {days} days", {
									year: dayjs.utc(checkpoint.dueAt).format("YYYY"),
									days: CHECKPOINT_DAYS,
								})
							: t("checkpoints.pay.days", "{count} days from the start", {
									count: CHECKPOINT_DAYS,
								})
					}
				/>
				<HeadlineCard
					label={t("checkpoints.pay.capacity", "Team capacity")}
					value={
						capacity.hoursPerWeek
							? t("advisor.card.hoursPerSprint", "{hours} h / sprint", {
									hours: hoursSpan(capacity.hoursPerWeek),
								})
							: "—"
					}
					muted={!capacity.hoursPerWeek}
					sub={
						capacity.hoursPerRun
							? t("advisor.card.hoursPerRun", "{hours} h over 28 days", {
									hours: hoursSpan(capacity.hoursPerRun),
								})
							: t(
									"checkpoints.pay.capacityUnknown",
									"Nobody has stated their hours yet",
								)
					}
				/>
			</div>

			<section className={scout.sectionTight}>
				<Text className={scout.sectionTitle}>
					{t("checkpoints.pay.goal", "The goal")}
				</Text>
				<Paragraph className={styles.goal}>
					{checkpoint.goal ||
						t("checkpoints.goal.empty", "The goal is not written yet")}
				</Paragraph>
			</section>

			{list(
				t("checkpoints.pay.whatExists", "What exists now"),
				side(CheckpointItemKind.Input),
			)}

			{list(
				t("checkpoints.pay.whatMustExist", "What must exist by day 28"),
				side(CheckpointItemKind.Outcome),
			)}
		</Flex>
	);
}
