import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IconPacman } from "@tabler/icons-react";
import { Avatar, Card, Tag, Tooltip, Typography } from "antd";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import applauseDefaultAnimation from "@/assets/images/icons/applaause-default.json";
import DefaultCover from "./DefaultCover";
import styles from "./styles.module.scss";

const { Title } = Typography;

function accentForWorkflowStage(stage?: string): string {
	if (!stage) return "#A1A1AA";
	const s = stage.toLowerCase();
	if (/active|live|release|done|published|complete/.test(s)) return "#22C55E";
	if (/draft|progress|planned|pause|hold|wip/.test(s)) return "#F59E0B";
	return "#6366F1";
}
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

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
	status?: prismaClient.ProjectStatus;
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
				href={isUserProject ? `/user/project/${slug}` : `/project/${slug}`}
				className={`${styles.gameCardLink} ${styles.hubLink}`}
			>
				<Card
					className={`${styles.gameCard} ${styles.hubCard}`}
					styles={{ body: { padding: 0 } }}
				>
					<div className={styles.hubCardContent}>
						<div className={styles.hubImageContainer}>
							{coverImage ? (
								<Image
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
								{status === prismaClient.ProjectStatus.Archived
									? `(${status})`
									: null}
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
			href={isUserProject ? `/user/project/${slug}` : `/project/${slug}`}
			className={styles.gameCardLink}
		>
			<Card className={styles.gameCard} styles={{ body: { padding: 0 } }}>
				<div className={styles.gameCardContent}>
					<div className={styles.gameCardImageContainer}>
						{coverImage ? (
							<Image
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
									<div className={styles.gameCardApplause}>
										<span
											className={styles.gameCardApplauseIcon}
											style={{ width: 22, height: 22 }}
										>
											<Lottie
												animationData={applauseDefaultAnimation}
												autoplay={false}
												loop={false}
												className={styles.gameCardApplauseIconAnimation}
											/>
										</span>
										<span>{applauseCount}</span>
									</div>
								) : null}
							</div>
						</div>
					)}

					{isUserProject && authorName && (
						<div className={styles.gameCardAuthor}>
							<Tooltip title={`Author: ${authorName}`}>
								{authorAvatar ? (
									<Avatar
										src={authorAvatar}
										alt={authorName}
										className={styles.authorAvatar}
									/>
								) : (
									<Avatar className={styles.authorAvatar}>
										{authorName.charAt(0).toUpperCase()}
									</Avatar>
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
