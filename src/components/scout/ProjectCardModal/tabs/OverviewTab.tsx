"use client";

import {
	IconArrowRight,
	IconExternalLink,
	IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Avatar, Flex, Typography } from "antd";
import dayjs from "dayjs";
import Image from "next/image";
import { ProjectVideoCover } from "@/components/project/ProjectVideoCover";
import { formatDollar } from "@/helpers/format";
import { date, LONG_DETAIL, shortDate, specialityLine } from "../format";
import {
	ActivityFeed,
	fileIcon,
	Section,
	SectionLink,
	SummaryCard,
} from "../parts";
import styles from "../style.module.scss";
import type { CardActivity, CardFile, ProjectCardOverview } from "../types";
import { useCardSection } from "../useSection";

const { Text, Paragraph } = Typography;

export function OverviewTab({
	project,
	onOpenTab,
}: {
	project: ProjectCardOverview;
	onOpenTab: (key: string) => void;
}) {
	const { t } = useTranslate();

	// Two files and five activities: the digests are the tabs' own sections
	// asked for a handful of rows, not a second shape to keep in step.
	const files = useCardSection<CardFile[]>(project.id, "files", 2);
	const activities = useCardSection<CardActivity[]>(
		project.id,
		"activities",
		5,
	);

	// Nothing to put beside the details when the project has neither.
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
		<Flex vertical gap={18}>
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
				{/* Nothing filled in is a short card saying so, not 270 of empty
				    box with a heading floating at the top of it. */}
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
								{project.detailsTask
									? t(
											"scout.card.details.emptyTask",
											"The team has not finished “{task}” yet",
											{ task: project.detailsTask },
										)
									: t(
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

				{/* The same cover-with-inline-player the project page uses: with a
				    pitch video it plays in place, without one it is simply the
				    game's cover — not a play button over a dead link. */}
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

			<div className={styles.summary}>
				<SummaryCard
					label={t("scout.card.summary.started", "STARTED")}
					onClick={() => onOpenTab("workflow")}
				>
					<Text className={styles.summaryValue}>{date(project.startedAt)}</Text>
					<Text className={styles.summarySub}>
						{project.startedStage
							? t("scout.card.summary.startedStage", "{stage} phase", {
									stage: project.startedStage,
								})
							: dayjs(project.startedAt).fromNow()}
					</Text>
				</SummaryCard>

				<SummaryCard
					label={t("scout.card.summary.stage", "STAGE")}
					onClick={() => onOpenTab("workflow")}
				>
					<Flex align="center" gap={6}>
						<span className={styles.stageDot} />
						<Text className={styles.summaryValue}>{project.stage ?? "—"}</Text>
					</Flex>
					<Text className={styles.summarySub}>
						{project.stageDeadline
							? t("scout.card.summary.deadline", "Planned · {date}", {
									date: date(project.stageDeadline),
								})
							: t("scout.card.summary.noDeadline", "No date planned")}
					</Text>
				</SummaryCard>

				<SummaryCard
					label={t("scout.card.summary.round", "ROUND")}
					onClick={() => onOpenTab("investment")}
				>
					<Text className={styles.summaryValue}>
						{project.estimate
							? formatDollar(project.estimate.remaining, { fractionDigits: 0 })
							: "—"}
					</Text>
					<Text className={styles.summarySub}>
						{project.equity
							? t(
									"scout.card.summary.roundEquity",
									"Investor reserve {reserve}% · {free}% unallocated",
									{
										reserve: project.equity.investmentReserve,
										free: project.equity.unallocated,
									},
								)
							: t("scout.card.summary.roundSub", "Estimated to reach release")}
					</Text>
				</SummaryCard>

				<SummaryCard
					label={t("scout.card.summary.author", "AUTHOR")}
					onClick={() => onOpenTab("team")}
				>
					<Flex align="center" gap={10}>
						<Avatar size={34} src={project.author.image}>
							{project.author.name?.charAt(0)}
						</Avatar>
						<Flex vertical gap={2} className={styles.person}>
							<Text className={styles.authorName} ellipsis>
								{project.author.name ?? "—"}
							</Text>
							<Text className={styles.summarySub} ellipsis>
								{specialityLine(project.author.speciality) ?? "—"}
							</Text>
						</Flex>
					</Flex>
				</SummaryCard>

				<SummaryCard
					label={t("scout.card.summary.team", "TEAM")}
					onClick={() => onOpenTab("team")}
				>
					{/* `max.count` covers the faces plus the counter, so the whole
					    stack renders and antd owns the overlap and the rings. */}
					<Avatar.Group size={30} max={{ count: 5 }} className={styles.avatars}>
						{project.teamFaces.map((face) => (
							<Avatar key={face.id} src={face.image} alt={face.name ?? ""}>
								{face.name?.charAt(0)}
							</Avatar>
						))}
						{project.teamSize > project.teamFaces.length && (
							<Avatar key="more" className={styles.avatarMore}>
								+{project.teamSize - project.teamFaces.length}
							</Avatar>
						)}
					</Avatar.Group>
					<Text className={styles.summarySub}>
						{t(
							"scout.card.summary.teamSub",
							"{members} members · {investors} investors",
							{
								members: project.teamSize,
								investors: project.investorCount,
							},
						)}
					</Text>
				</SummaryCard>

				<SummaryCard
					label={t("scout.card.summary.reviews", "EXPERT REVIEWS")}
					onClick={() => onOpenTab("reviews")}
				>
					<Text className={styles.summaryValue}>{project.reviewCount}</Text>
					<Text className={styles.summarySub}>
						{t("scout.card.summary.reviewsSub", "expert reviews left")}
					</Text>
				</SummaryCard>
			</div>

			{(files.isLoading || !!files.data?.length) && (
				<Section
					title={t("scout.card.files.title", "Files")}
					action={
						<SectionLink onClick={() => onOpenTab("files")}>
							{t("scout.card.viewAll", "View all")}
						</SectionLink>
					}
					loading={files.isLoading}
					rows={2}
				>
					<div className={styles.fileCards}>
						{files.data?.map((file) => (
							/* The whole card is the link: the name alone was a small
							   target inside a box that already reads as clickable. */
							<a
								key={file.id}
								className={styles.fileCard}
								href={file.link}
								target="_blank"
								rel="noreferrer"
							>
								<Text className={styles.eyebrow}>{file.type}</Text>
								<Flex align="center" gap={10}>
									<span className={styles.fileTile}>{fileIcon(file.type)}</span>
									<span className={styles.fileName}>
										{file.name ?? file.type}
									</span>
									<IconExternalLink size={14} className={styles.fileGo} />
								</Flex>
								<Text className={styles.summarySub}>
									{t("scout.card.files.added", "Updated {date} · {who}", {
										date: date(file.updatedAt),
										who: file.createdByUser?.name ?? "—",
									})}
								</Text>
							</a>
						))}
					</div>
				</Section>
			)}

			{project.latestDevlog && (
				<Section
					title={t("scout.card.devlog.latest", "Latest devlog")}
					action={
						<SectionLink href={`/project/${project.slug}`}>
							{t("scout.card.devlog.all", "All devlogs")}
						</SectionLink>
					}
					loading={false}
				>
					<div className={styles.devlogCard}>
						{project.coverImage && (
							<div className={styles.devlogCover}>
								<Image
									src={project.coverImage}
									alt=""
									fill
									sizes="200px"
									className={styles.videoCover}
								/>
							</div>
						)}
						<div className={styles.devlogBody}>
							<Text className={styles.summarySub}>
								{shortDate(project.latestDevlog.publishedAt)} ·{" "}
								{project.latestDevlog.author?.name ?? "—"}
							</Text>
							<Paragraph
								className={styles.devlogExcerpt}
								ellipsis={{ rows: 2 }}
								type="secondary"
							>
								{project.latestDevlog.content}
							</Paragraph>
							<a
								className={styles.readPost}
								href={`/project/${project.slug}`}
								target="_blank"
								rel="noreferrer"
							>
								{t("scout.card.devlog.read", "Read post")}
								<IconArrowRight size={14} />
							</a>
						</div>
					</div>
				</Section>
			)}

			<Section
				title={t("scout.card.activity.title", "Recent activity")}
				action={
					<SectionLink onClick={() => onOpenTab("activities")}>
						{t("scout.card.viewAll", "View all")}
					</SectionLink>
				}
				loading={activities.isLoading}
			>
				<ActivityFeed items={activities.data ?? []} />
			</Section>
		</Flex>
	);
}

/**
 * A digest's way out. Where the card has a tab holding the full list, the link
 * opens it — sending a scout to the public project page for rows that are two
 * clicks away inside the card they already have open is a detour.
 */
