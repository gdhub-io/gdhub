"use client";

import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import Link from "next/link";
import { ApplauseButton } from "@/components/ApplauseButton";
import type { ProjectLink } from "@/types/project";
import styles from "./ProjectStoreCard.module.scss";
import type { ProjectCardTeam } from "./parts";
import { Cover, StageChip, TeamFacts } from "./parts";

export type StorePlatform =
	| "steam"
	| "itch-io"
	| "epic-store"
	| "google-play"
	| "app-store";

export type StorefrontLink = ProjectLink & { platform: StorePlatform };

/** Each storefront's own colour, so the dot names the shop without a logo. */
const STORE_LABEL: Record<StorePlatform, string> = {
	steam: "on Steam",
	"itch-io": "on itch.io",
	"epic-store": "on Epic Store",
	"google-play": "on Google Play",
	"app-store": "on App Store",
};

const STORE_DOT_CLASS: Record<StorePlatform, string> = {
	steam: styles.dotSteam,
	"itch-io": styles.dotItch,
	"epic-store": styles.dotEpic,
	"google-play": styles.dotGooglePlay,
	"app-store": styles.dotAppStore,
};

export type ProjectStoreCardProps = {
	projectId: string;
	slug: string;
	name: string;
	description?: string | null;
	genre?: string | null;
	platform?: string | null;
	coverImage?: string | null;
	stage?: string | null;
	applauseCount?: number;
	storeLinks?: StorefrontLink[];
	team?: ProjectCardTeam;
	authorName?: string | null;
};

/**
 * A shipped project — the same zones as `ProjectCard`, with more room.
 *
 * A project that has actually launched has earned a bigger cover and a full
 * description, so this one runs half a row wide instead of a quarter. The store
 * badges live on the cover next to the applause: where you can buy it is part
 * of the artwork's promise, not a detail in the body copy.
 */
export function ProjectStoreCard({
	projectId,
	slug,
	name,
	description,
	genre,
	platform,
	coverImage,
	stage,
	applauseCount,
	storeLinks,
	team,
	authorName,
}: ProjectStoreCardProps) {
	const { t } = useTranslate();
	const meta = [genre, platform].filter(Boolean).join(" · ");

	return (
		<article className={styles.card}>
			<div className={styles.cover}>
				<Cover
					coverImage={coverImage}
					title={name}
					sizes="(max-width: 768px) 100vw, 50vw"
				/>
				<div className={styles.coverChrome}>
					{stage ? <StageChip label={stage} /> : <span />}
					<div className={styles.reactionRow}>
						<div className={styles.storeBadges}>
							{storeLinks?.map((link) => (
								<a
									key={link.platform}
									href={link.link}
									target="_blank"
									rel="noreferrer"
									className={styles.storeBadge}
									onClick={(event) => event.stopPropagation()}
								>
									<span
										className={`${styles.platformDot} ${
											STORE_DOT_CLASS[link.platform]
										}`}
									/>
									{STORE_LABEL[link.platform]}
								</a>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className={styles.body}>
				<div className={styles.head}>
					{meta && <p className={styles.meta}>{meta}</p>}
					<h3 className={styles.title}>{name}</h3>
					{description && <p className={styles.description}>{description}</p>}
				</div>

				<div className={styles.foot}>
					<div className={styles.facts}>
						{team && (
							<TeamFacts
								team={team}
								label={t("project-card.inTeam", "{count} in team", {
									count: team.count,
								})}
							/>
						)}
						{authorName && (
							<span className={styles.author}>
								{t("project-card.by", "by {name}", { name: authorName })}
							</span>
						)}
					</div>
					{/* With the action, not on the artwork — see `ProjectCard`. */}
					<div className={styles.footActions}>
						<ApplauseButton
							subject={{ kind: "project", id: projectId }}
							count={applauseCount}
						/>
						<Link href={`/project/${slug}`} className={styles.detailsLink}>
							<Button type="primary" size="small" className={styles.details}>
								{t("project-card.details", "Details")}
							</Button>
						</Link>
					</div>
				</div>
			</div>
		</article>
	);
}

export default ProjectStoreCard;
