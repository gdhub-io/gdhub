"use client";

import { IconCube, IconExternalLink } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Typography } from "antd";
import dayjs from "dayjs";
import { IconTile } from "@/components/ui";
import { dayNumberOn } from "@/lib/checkpoints/days";
import type {
	AdvisorCheckpointDto,
	VerdictContextDto,
} from "@/types/checkpoints";
import { Aside, Section } from "./Section";
import styles from "./style.module.scss";

const { Text } = Typography;

export function LastBuild({
	checkpoint,
	build,
}: {
	checkpoint: AdvisorCheckpointDto;
	build: VerdictContextDto["lastBuild"];
}) {
	const { t } = useTranslate();

	return (
		<Section
			title={t("advisor.verdict.lastBuild", "Last build")}
			aside={
				build && (
					<Aside>
						{[
							t("advisor.verdict.uploaded", "Uploaded {date}", {
								date: dayjs(build.createdAt).format("D MMM"),
							}),
							checkpoint.startedAt
								? t("advisor.verdict.day", "day {n}", {
										n: dayNumberOn(
											new Date(checkpoint.startedAt),
											new Date(build.createdAt),
										),
									})
								: null,
						]
							.filter(Boolean)
							.join(" · ")}
					</Aside>
				)
			}
		>
			{build ? (
				<Flex align="center" gap={16} className={styles.build}>
					<IconTile icon={IconCube} size="md" />
					<Flex vertical gap={4} className={styles.rowText}>
						<Text strong ellipsis>
							{build.name ?? t("advisor.verdict.build", "Build")}
						</Text>
						{build.domain && (
							<Text type="secondary" className={styles.small}>
								{build.domain}
							</Text>
						)}
					</Flex>
					<Button
						href={build.link}
						target="_blank"
						icon={<IconExternalLink size={14} />}
						iconPlacement="end"
					>
						{t("advisor.verdict.openBuild", "Open the build")}
					</Button>
				</Flex>
			) : (
				<Text type="secondary" className={styles.rowEmpty}>
					{t(
						"advisor.verdict.noBuild",
						"No build was uploaded in these 28 days.",
					)}
				</Text>
			)}
		</Section>
	);
}
