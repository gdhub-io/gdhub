"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import dayjs from "dayjs";
import { ProjectVideoCover } from "@/components/project/ProjectVideoCover";
import { date, LONG_DETAIL } from "@/components/scout/ProjectCardModal/format";
import {
	HeadlineCard,
	Section,
	SummaryCard,
} from "@/components/scout/ProjectCardModal/parts";
import styles from "@/components/scout/ProjectCardModal/style.module.scss";
import type { AdvisorProjectDto } from "@/types/checkpoints";
import { DevlogCard } from "./DevlogCard";

const { Text, Paragraph } = Typography;

/**
 * The scout's Overview, as the Project tab, without the round, the author, the
 * files or the log — and with the project's last three devlogs, which show a
 * curator still deciding how the team works before any of this checkpoint's.
 */
export function ProjectTab({
	project,
	onOpenTab,
}: {
	project: AdvisorProjectDto;
	onOpenTab: (key: string) => void;
}) {
	const { t } = useTranslate();
	const hasMedia = !!(project.coverImage || project.videoLink);

	const details = [
		[t("scout.card.details.genre", "Genre"), project.details.genre],
		[t("scout.card.details.setting", "Game setting"), project.details.setting],
		[t("scout.card.details.audience", "Audience"), project.details.audition],
		[t("scout.card.details.platform", "Platform"), project.details.platform],
		[
			t("scout.card.details.style", "Visual style"),
			project.details.visualStyle,
		],
	].filter(([, value]) => value);

	return (
		<Flex vertical gap={16}>
			{project.description && (
				<section className={styles.sectionTight}>
					<Text className={styles.sectionTitle}>
						{t("scout.card.about", "About")}
					</Text>
					<Paragraph type="secondary" className={styles.about}>
						{project.description}
					</Paragraph>
				</section>
			)}

			<div className={hasMedia ? styles.mediaRow : styles.mediaRowSolo}>
				<div
					className={
						details.length ? styles.detailsCard : styles.detailsCardEmpty
					}
				>
					<div className={styles.detailsHead}>
						<Text className={styles.sectionTitle}>
							{t("scout.card.details.title", "Game details")}
						</Text>
						{!details.length && (
							<Text type="secondary" className={styles.caption}>
								{t(
									"scout.card.details.empty",
									"The team has not filled in the game details yet",
								)}
							</Text>
						)}
					</div>
					<div className={styles.detailRows}>
						{details.map(([label, value]) => (
							<div
								key={label}
								className={
									(value?.length ?? 0) > LONG_DETAIL
										? styles.detailRowStacked
										: styles.detailRow
								}
							>
								<Text className={styles.detailKey}>{label}</Text>
								<Text className={styles.detailValue}>{value}</Text>
							</div>
						))}
					</div>
				</div>

				{hasMedia && (
					<ProjectVideoCover
						coverImage={project.coverImage}
						videoLink={project.videoLink}
						alt={project.name}
					>
						{project.videoLink && (
							<>
								<span className={styles.videoScrim} />
								<span className={styles.videoLabel}>
									{t("scout.card.video", "Pitch video")}
								</span>
							</>
						)}
					</ProjectVideoCover>
				)}
			</div>

			<div className={styles.headline}>
				<HeadlineCard
					label={t("scout.card.summary.started", "STARTED")}
					value={date(project.startedAt)}
					sub={dayjs(project.startedAt).fromNow()}
				/>
				<HeadlineCard
					label={t("scout.card.summary.stage", "STAGE")}
					value={project.stage ?? "—"}
					muted={!project.stage}
					sub={t("advisor.card.stageSub", "Where the project is now")}
				/>
				<SummaryCard
					label={t("scout.card.summary.team", "TEAM")}
					onClick={() => onOpenTab("team")}
				>
					<Text className={styles.headlineValue}>{project.team.length}</Text>
					<Text className={styles.summarySub}>
						{t("advisor.card.teamSub", "{count} stated their hours", {
							count: project.capacity.stated,
						})}
					</Text>
				</SummaryCard>
			</div>
			{project.latestDevlogs.length > 0 && (
				<Section
					title={t("advisor.card.latestDevlogs", "Latest devlogs")}
					loading={false}
				>
					<Flex vertical gap={12}>
						{project.latestDevlogs.map((devlog) => (
							<DevlogCard key={devlog.id} {...devlog} />
						))}
					</Flex>
				</Section>
			)}
		</Flex>
	);
}
