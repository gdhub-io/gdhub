"use client";

import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import Link from "next/link";
import { ApplauseButton } from "@/components/ApplauseButton";
import styles from "./ProjectCard.module.scss";
import type { ProjectCardTeam } from "./parts";
import { Cover, HiringChip, StageChip, TeamFacts } from "./parts";

export type ProjectCardProps = {
	projectId: string;
	slug: string;
	name: string;
	description?: string | null;
	genre?: string | null;
	platform?: string | null;
	coverImage?: string | null;
	/** Workflow step the project is on — the chip in the cover's top-left. */
	stage?: string | null;
	hasOpenPositions?: boolean;
	applauseCount?: number;
	team?: ProjectCardTeam;
	authorName?: string | null;
};

/**
 * A project as a card: artwork first, then what it is, then who is behind it.
 *
 * The cover is the identity strip and takes the full width — a project is sold
 * by its art. Everything that has to survive on top of an unknown image (stage,
 * hiring, applause) sits in the cover on its own plate; everything that reads
 * as text lives below on paper.
 */
export function ProjectCard({
	projectId,
	slug,
	name,
	description,
	genre,
	platform,
	coverImage,
	stage,
	hasOpenPositions,
	applauseCount,
	team,
	authorName,
}: ProjectCardProps) {
	const { t } = useTranslate();
	const meta = [genre, platform].filter(Boolean).join(" · ");

	return (
		<article className={styles.card}>
			<div className={styles.cover}>
				<Cover
					coverImage={coverImage}
					title={name}
					sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 25vw"
				/>
				<div className={styles.coverChrome}>
					<div className={styles.chips}>
						{stage ? <StageChip label={stage} /> : <span />}
						{hasOpenPositions && (
							<HiringChip label={t("project-card.hiring", "Hiring")} />
						)}
					</div>
				</div>
			</div>

			<div className={styles.body}>
				<div className={styles.head}>
					{meta && <p className={styles.meta}>{meta}</p>}
					<h3 className={styles.title}>{name}</h3>
				</div>
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
				{/* Applause sits with the action, not on the artwork: it is a
				    number about the project, and on a cover it had to carry a plate
				    to stay legible. */}
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
		</article>
	);
}

export default ProjectCard;
