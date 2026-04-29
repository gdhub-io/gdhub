import { SiEpicgames } from "@react-icons/all-files/si/SiEpicgames";
import {
	IconArrowRight,
	IconBrandApple,
	IconBrandGooglePlay,
	IconBrandItch,
	IconBrandSteam,
	IconPacman,
} from "@tabler/icons-react";
import { Col, Row, Skeleton, Tag, Typography } from "antd";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import applauseDefaultAnimation from "@/assets/images/icons/applaause-default.json";
import DefaultCover from "@/components/GameCard/DefaultCover";
import type { ProjectLink } from "@/types/project";
import styles from "./styles.module.scss";

const { Paragraph, Title } = Typography;
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

type StorePlatform =
	| "steam"
	| "itch-io"
	| "epic-store"
	| "google-play"
	| "app-store";

type StorefrontLink = ProjectLink & {
	platform: StorePlatform;
};

export type GameOnStoreCardListItem = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	genre: string | null;
	platform: string | null;
	coverImage: string | null;
	applauseCount?: number;
	hasOpenPositions?: boolean;
	storeLinks: StorefrontLink[];
	workflow: {
		currentStep: {
			name: string;
			order: number;
		};
	};
};

type GameOnStoreCardListProps = {
	projects?: GameOnStoreCardListItem[];
	loading?: boolean;
};

const STORE_CARD_SKELETON_KEYS = [
	"store-skeleton-1",
	"store-skeleton-2",
] as const;

const STORE_META: Record<
	StorePlatform,
	{
		badgeLabel: string;
		icon: React.ReactNode;
		badgeClassName: string;
	}
> = {
	steam: {
		badgeLabel: "on Steam",
		icon: <IconBrandSteam size={14} />,
		badgeClassName: styles.steamBadge,
	},
	"itch-io": {
		badgeLabel: "on itch.io",
		icon: <IconBrandItch size={14} />,
		badgeClassName: styles.itchBadge,
	},
	"epic-store": {
		badgeLabel: "on Epic Store",
		icon: <SiEpicgames size={12} />,
		badgeClassName: styles.epicBadge,
	},
	"google-play": {
		badgeLabel: "on Google Play",
		icon: <IconBrandGooglePlay size={14} />,
		badgeClassName: styles.googlePlayBadge,
	},
	"app-store": {
		badgeLabel: "on App Store",
		icon: <IconBrandApple size={14} />,
		badgeClassName: styles.appStoreBadge,
	},
};

const getGenres = (genre?: string | null) =>
	genre
		?.split(/[;,/]/)
		.map((item) => item.trim())
		.filter(Boolean)
		.slice(0, 3) || [];

const GameOnStoreCardList = ({
	projects = [],
	loading = false,
}: GameOnStoreCardListProps) => {
	if (loading) {
		return (
			<Row gutter={[16, 16]}>
				{STORE_CARD_SKELETON_KEYS.map((key) => (
					<Col key={key} xs={24} md={12}>
						<article className={styles.card}>
							<div className={styles.storeSkeletonCover}>
								<Skeleton.Image active className={styles.storeSkeletonImage} />
							</div>

							<div className={styles.storeSkeletonInfo}>
								<Skeleton
									active
									title={{ width: "55%" }}
									paragraph={{ rows: 3, width: ["80%", "65%", "45%"] }}
								/>
								<div className={styles.storeSkeletonBadges}>
									<Skeleton.Button active size="small" />
									<Skeleton.Button active size="small" />
								</div>
							</div>
						</article>
					</Col>
				))}
			</Row>
		);
	}

	if (!projects.length) {
		return null;
	}

	return (
		<Row gutter={[16, 16]}>
			{projects.map((project) => {
				const genres = getGenres(project.genre);

				return (
					<Col key={project.id} xs={24} md={12}>
						<article className={styles.card}>
							<Link
								href={`/project/${project.slug}`}
								className={styles.coverLink}
							>
								<div className={styles.cover}>
									{project.coverImage ? (
										<Image
											src={project.coverImage}
											alt={`${project.name} cover`}
											fill
											className={styles.coverImage}
											sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 33vw"
										/>
									) : (
										<DefaultCover title={project.name} />
									)}
								</div>
							</Link>

							{project.hasOpenPositions || project.applauseCount ? (
								<div className={styles.gameCardTopRight}>
									{project.hasOpenPositions ? (
										<div className={styles.openPositionsBadge}>
											<IconPacman size={18} /> <span>Hiring</span>
										</div>
									) : null}
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
										<span>{project.applauseCount}</span>
									</div>
								</div>
							) : null}

							<div className={styles.info}>
								<div className={styles.top}>
									<div>
										<Title level={4} className={styles.projectTitle}>
											{project.name}
										</Title>

										{project.description ? (
											<Paragraph
												className={styles.description}
												ellipsis={{ rows: 2 }}
											>
												{project.description}
											</Paragraph>
										) : null}
									</div>

									<div className={styles.meta}>
										{genres.map((genre) => (
											<Tag
												key={`${project.id}-${genre}`}
												className={styles.genreTag}
											>
												{genre}
											</Tag>
										))}
										{project.platform ? (
											<Tag className={styles.platformTag}>
												{project.platform}
											</Tag>
										) : null}
									</div>
								</div>

								<div className={styles.bottom}>
									<div className={styles.storeBadges}>
										{project.storeLinks.map((storeLink) => {
											const storeMeta = STORE_META[storeLink.platform];

											return (
												<Link
													key={`${project.id}-${storeLink.platform}`}
													href={storeLink.link}
													target="_blank"
													rel="noreferrer"
													className={styles.storeLink}
												>
													<span
														className={`${styles.storeBadge} ${storeMeta.badgeClassName}`}
													>
														{storeMeta.icon}
														{storeMeta.badgeLabel}
													</span>
												</Link>
											);
										})}
									</div>

									<Link
										href={`/project/${project.slug}`}
										className={styles.projectButton}
									>
										View project
										<IconArrowRight size={14} />
									</Link>
								</div>
							</div>
						</article>
					</Col>
				);
			})}
		</Row>
	);
};

export default GameOnStoreCardList;
