"use client";

import { IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Collapse, Flex, Typography } from "antd";
import { EvidenceMatchTag } from "@/components/checkpoints/EvidenceMatchTag";
import { VerdictChip } from "@/components/checkpoints/VerdictChip";
import { IconTile } from "@/components/ui";
import type { VerdictContextDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

const { Text } = Typography;

/**
 * Frame `vC7gn`: the verdict the AI would propose from the evidence, the
 * devlogs and the call notes (GDHUB-114). A reference only — the curator's
 * fields are their own and start empty.
 */
export function AiRead({
	read,
}: {
	read: NonNullable<VerdictContextDto["aiRead"]>;
}) {
	const { t } = useTranslate();

	return (
		<section className={styles.aiRead}>
			<Flex gap={12} align="center">
				<IconTile icon={IconSparkles} size="sm" />
				<Flex vertical>
					<Text strong>
						{t("advisor.verdict.aiRead.title", "The AI's read")}
					</Text>
					<Text type="secondary" className={styles.small}>
						{t(
							"advisor.verdict.aiRead.subtitle",
							"A reference for you. The decision and the words are yours.",
						)}
					</Text>
				</Flex>
			</Flex>
			<Flex gap={8} align="center" wrap>
				<Text type="secondary" className={styles.small}>
					{t("advisor.verdict.aiRead.proposes", "Would propose")}
				</Text>
				<VerdictChip verdict={read.proposed} />
			</Flex>
			<Text className={styles.small}>{read.summary}</Text>
			<Text type="secondary" className={styles.small}>
				{read.unproven.length
					? t(
							"advisor.verdict.aiRead.unproven",
							"No artifact that opens: {outcomes}",
							{ outcomes: read.unproven.map((item) => item.text).join("; ") },
						)
					: t(
							"advisor.verdict.aiRead.allProven",
							"Every outcome has an artifact that opens.",
						)}
			</Text>
			{read.evidence.length > 0 && (
				<Collapse
					ghost
					size="small"
					items={[
						{
							key: "evidence",
							label: t(
								"advisor.verdict.aiRead.evidence",
								"What each artifact shows",
							),
							children: (
								<Flex vertical gap={8}>
									{read.evidence.map((row) => (
										<Flex key={row.name} vertical gap={2}>
											<Flex gap={8} align="center" wrap>
												<Text strong className={styles.small}>
													{row.name}
												</Text>
												<EvidenceMatchTag match={row.match} />
											</Flex>
											{row.note && (
												<Text type="secondary" className={styles.small}>
													{row.note}
												</Text>
											)}
										</Flex>
									))}
								</Flex>
							),
						},
					]}
				/>
			)}
		</section>
	);
}
