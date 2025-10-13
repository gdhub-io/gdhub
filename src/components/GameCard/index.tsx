import { Avatar, Card, Tag, Tooltip, Typography } from "antd";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import DefaultCover from "./DefaultCover";
import styles from "./styles.module.scss";

const { Title, Text } = Typography;

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
}

const GameCard: React.FC<GameCardProps> = ({
	id,
	title,
	genre,
	platform,
	coverImage,
	slug,
	workflowStage,
	authorName,
	authorAvatar,
	isUserProject,
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

					{workflowStage && (
						<div className={styles.gameCardWorkflowStage}>
							<Tag className={styles.workflowStageTag}>{workflowStage}</Tag>
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
