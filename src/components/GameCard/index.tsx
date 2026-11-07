import { IconPacman } from "@tabler/icons-react";
import { Card, Tag, Tooltip, Typography } from "antd";
import Link from "next/link";
import type React from "react";
import { ApplauseButton } from "@/components/ApplauseButton";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { AppImage } from "@/components/ui/AppImage";
import { ProjectStatus } from "@/config/prisma-enums";
import { projectSpaceHref } from "@/helpers/project-space";
import DefaultCover from "./DefaultCover";
import styles from "./styles.module.scss";

const { Title } = Typography;

function accentForWorkflowStage(stage?: string): string {
	if (!stage) return "var(--gd-color-text-tertiary)";
	const s = stage.toLowerCase();
	if (/active|live|release|done|published|complete/.test(s))
		return "var(--gd-success-solid)";
	if (/draft|progress|planned|pause|hold|wip/.test(s))
		return "var(--gd-warning-solid)";
	return "var(--gd-info-solid)";
}

interface GameCardProps {
	id: string;
	title: string;
	genre?: string;
	platform?: string;
	coverImage?: string;
	slug: string;
	workflowStage?: string;
	authorName?: string;
	authorAvatar?: string;
	isUserProject?: boolean;
	applauseCount?: number;
	hasOpenPositions?: boolean;
	variant?: "default" | "hub";
	status?: ProjectStatus;
}

const GameCard: React.FC<GameCardProps> = ({
	title,
	genre,
	platform,
	coverImage,
	slug,
	workflowStage,
	authorName,
	authorAvatar,
	isUserProject,
	applauseCount,
	hasOpenPositions,
	variant = "default",
	status,
}) => {
	if (variant === "hub") {
		return (
			<Link
				href={isUserProject ? projectSpaceHref(slug) : `/project/${slug}`}
				className={`${styles.gameCardLink} ${styles.hubLink}`}
			>
				<Card
					className={`${styles.gameCard} ${styles.hubCard}`}
					styles={{ body: { padding: 0 } }}
				>
					<div className={styles.hubCardContent}>
						<div className={styles.hubImageContainer}>
							{coverImage ? (
								<AppImage
									src={coverImage}
									alt={`${title} cover`}
									fill
									className={styles.gameCardImage}
									sizes="160px"
								/>
							) : (
								<DefaultCover title={title} />
							)}
						</div>
						<div className={styles.hubInfo}>
							<Title level={5} className={styles.hubTitle}>
								{title}{" "}
								{status === ProjectStatus.Archived ? `(${status})` : null}
							</Title>
							<div className={styles.hubMeta}>
								<span
									className={styles.hubStageDot}
									style={{
										background: accentForWorkflowStage(workflowStage),
									}}
									aria-hidden
								/>
								<span className={styles.hubMetaText}>
									{[workflowStage, genre || platform || authorName]
										.filter(Boolean)
										.join(" · ") || "Project"}
								</span>
							</div>
						</div>
					</div>
				</Card>
			</Link>
		);
	}

	return (
		<Link
			href={isUserProject ? projectSpaceHref(slug) : `/project/${slug}`}
			className={styles.gameCardLink}
		>
			<Card className={styles.gameCard} styles={{ body: { padding: 0 } }}>
				<div className={styles.gameCardContent}>
					<div className={styles.gameCardImageContainer}>
						{coverImage ? (
							<AppImage
								src={coverImage}
								alt={`${title} cover`}
								fill
								className={styles.gameCardImage}
								sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
							/>
						) : (
							<DefaultCover title={title} />
						)}
					</div>

					{(workflowStage || hasOpenPositions || applauseCount) && (
						<div className={styles.gameCardTopRight}>
							{workflowStage && (
								<div className={styles.gameCardWorkflowStage}>
									<Tag className={styles.workflowStageTag}>{workflowStage}</Tag>
								</div>
							)}
							<div className={styles.gameCardTopBadges}>
								{hasOpenPositions ? (
									<div className={styles.openPositionsBadge}>
										<IconPacman size={18} /> <span>Hiring</span>
									</div>
								) : null}
								{applauseCount ? (
									<ApplauseButton count={applauseCount} variant="chip" />
								) : null}
							</div>
						</div>
					)}

					{isUserProject && authorName && (
						<div className={styles.gameCardAuthor}>
							<Tooltip title={`Author: ${authorName}`}>
								{authorAvatar ? (
									<AppAvatar
										src={authorAvatar}
										alt={authorName}
										className={styles.authorAvatar}
									/>
								) : (
									<AppAvatar className={styles.authorAvatar}>
										{authorName.charAt(0).toUpperCase()}
									</AppAvatar>
								)}
							</Tooltip>
						</div>
					)}

					<div className={styles.gameCardInfo}>
						<Title level={4} className={styles.gameCardTitle}>
							{title}
						</Title>
						<div className={styles.gameCardMeta}>
							{genre && <Tag className={styles.gameCardGenre}>{genre}</Tag>}
							{platform && (
								<Tag className={styles.gameCardPlatform}>{platform}</Tag>
							)}
							{isUserProject && (
								<Tag className={styles.gameCardUserProject}>User Project</Tag>
							)}
						</div>
					</div>
				</div>
			</Card>
		</Link>
	);
};

export default GameCard;
