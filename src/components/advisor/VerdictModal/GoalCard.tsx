"use client";

import {
	IconCircle,
	IconCircleCheck,
	IconCircleMinus,
	IconPaperclip,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Segmented, Typography } from "antd";
import clsx from "clsx";
import { useState } from "react";
import { SectionHeading, StatusDot } from "@/components/ui";
import { CheckpointItemKind } from "@/config/prisma-enums";
import { isProven } from "@/lib/checkpoints/verdict";
import type {
	AdvisorCheckpointDto,
	CheckpointItemDto,
} from "@/types/checkpoints";
import { ArtifactLink } from "./Section";
import styles from "./style.module.scss";

const { Text, Paragraph } = Typography;

const byOrder = (a: CheckpointItemDto, b: CheckpointItemDto) =>
	a.order - b.order;

export function GoalCard({ checkpoint }: { checkpoint: AdvisorCheckpointDto }) {
	const { t } = useTranslate();
	const [side, setSide] = useState<"now" | "day1">("now");
	const kind =
		side === "now" ? CheckpointItemKind.Outcome : CheckpointItemKind.Input;
	const items = checkpoint.items
		.filter((item) => item.kind === kind)
		.sort(byOrder);

	return (
		<section>
			<Flex align="center" gap={12} className={styles.sectionHead}>
				<SectionHeading
					level={4}
					title={t("advisor.verdict.goalCard", "Goal card")}
					className={styles.inlineHeading}
				/>
				<Segmented
					size="small"
					value={side}
					onChange={setSide}
					options={[
						{ value: "now", label: t("advisor.verdict.now", "Now") },
						{ value: "day1", label: t("advisor.verdict.day1", "On day 1") },
					]}
				/>
			</Flex>

			<Flex vertical gap={16} className={styles.goalBody}>
				<Flex vertical gap={4}>
					<Text type="secondary" className={styles.small}>
						{t("checkpoints.pay.goal", "The goal")}
					</Text>
					<Paragraph className={styles.goal}>{checkpoint.goal}</Paragraph>
				</Flex>

				<div>
					<Text type="secondary" className={styles.small}>
						{side === "now"
							? t("checkpoints.pay.whatMustExist", "What must exist by day 28")
							: t("advisor.verdict.whatExisted", "What existed on day 1")}
					</Text>
					{items.length === 0 ? (
						<Text type="secondary" className={styles.rowEmpty}>
							{t("checkpoints.goal.sideEmpty", "Nothing listed")}
						</Text>
					) : (
						items.map((item) =>
							side === "now" ? (
								<OutcomeRow key={item.id} item={item} />
							) : (
								<Flex
									key={item.id}
									align="center"
									gap={12}
									className={styles.row}
								>
									<IconPaperclip size={16} className={styles.muted} />
									<Text className={styles.rowText}>{item.text}</Text>
									{item.evidence.length ? (
										<Flex vertical align="end" gap={4}>
											{item.evidence.map(({ artifact }) => (
												<ArtifactLink key={artifact.id} artifact={artifact} />
											))}
										</Flex>
									) : (
										<Text type="secondary" className={styles.small}>
											{t("advisor.verdict.noArtifact", "No artifact")}
										</Text>
									)}
								</Flex>
							),
						)
					)}
				</div>
			</Flex>
		</section>
	);
}

function OutcomeRow({ item }: { item: CheckpointItemDto }) {
	const { t } = useTranslate();
	const proven = !item.cut && isProven(item);
	const Icon = item.cut
		? IconCircleMinus
		: proven
			? IconCircleCheck
			: IconCircle;

	return (
		<Flex align="center" gap={12} className={styles.row}>
			<Icon size={16} className={proven ? styles.success : styles.muted} />
			<Text className={clsx(styles.rowText, item.cut && styles.cut)}>
				{item.text}
			</Text>
			{item.cut ? (
				<StatusDot tone="warning" label={t("advisor.verdict.cut", "Cut")} />
			) : item.evidence.length ? (
				<Flex align="center" gap={8} className={styles.evidence}>
					<Flex vertical gap={4}>
						{item.evidence.map(({ artifact }) => (
							<ArtifactLink key={artifact.id} artifact={artifact} />
						))}
					</Flex>
					{proven && (
						<Text className={clsx(styles.small, styles.success)}>
							{t("advisor.verdict.proven", "· proven")}
						</Text>
					)}
				</Flex>
			) : (
				<Text type="secondary" className={styles.small}>
					{t("advisor.verdict.noEvidence", "No evidence attached")}
				</Text>
			)}
		</Flex>
	);
}
