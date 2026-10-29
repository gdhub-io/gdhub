"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Tag, Typography } from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import type { AdvisorProjectDto } from "@/types/checkpoints";
import { Aside, Section } from "./Section";
import styles from "./style.module.scss";

const { Text } = Typography;

export function Devlogs({
	devlogs,
}: {
	devlogs: AdvisorProjectDto["devlogs"];
}) {
	const { t } = useTranslate();
	const published = new Set(
		devlogs.flatMap((devlog) => (devlog.sprint ? [devlog.sprint] : [])),
	).size;

	return (
		<Section
			title={t("advisor.card.devlogs", "Devlogs")}
			aside={
				<Aside>
					{t("advisor.verdict.devlogsCount", "{n} of {total} published", {
						n: published,
						total: SPRINTS_PER_CHECKPOINT,
					})}
				</Aside>
			}
		>
			{devlogs.length === 0 ? (
				<Text type="secondary" className={styles.rowEmpty}>
					{t("advisor.verdict.noDevlogs", "No devlogs were published.")}
				</Text>
			) : (
				devlogs.map((devlog) => (
					<Flex
						key={devlog.id}
						align="center"
						gap={12}
						className={styles.devlog}
					>
						{devlog.sprint && (
							<Tag className={styles.sprintTag}>
								{t("checkpoints.signals.sprintShort", "S{n}", {
									n: devlog.sprint,
								})}
							</Tag>
						)}
						<Text ellipsis className={clsx(styles.rowText, styles.devlogTitle)}>
							{devlog.content.split("\n").find((line) => line.trim()) ?? ""}
						</Text>
						<Text className={styles.aside}>
							{dayjs(devlog.publishedAt).format("D MMM YYYY")}
						</Text>
					</Flex>
				))
			)}
		</Section>
	);
}
