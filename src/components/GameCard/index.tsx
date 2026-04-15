import { IconPacman } from "@tabler/icons-react";
import { Avatar, Card, Space, Tag, Tooltip, Typography } from "antd";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import applauseDefaultAnimation from "@/assets/images/icons/applaause-default.json";
import DefaultCover from "./DefaultCover";
import styles from "./styles.module.scss";

const { Title } = Typography;
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
}) => {
	return (
		<Link
			href={isUserProject ? `/my/projects/${slug}` : `/project/${slug}`}
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
