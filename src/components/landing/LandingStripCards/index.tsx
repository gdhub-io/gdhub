import { IconPhoto } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Tag, Typography } from "antd";
import Link from "next/link";
import { getWorkDirection } from "@/components/DirectionBadge";
import { IconTile } from "@/components/ui";
import { AppImage } from "@/components/ui/AppImage";
import { skillLevelsList } from "@/components/ui/skillLevel";
import type {
	LandingExpert,
	LandingProject,
	LandingTalent,
} from "@/repositories/content/landing";
import styles from "./style.module.scss";

const { Text, Paragraph } = Typography;

/** Frame `hoLUU`: a project an author is building — cover, name, genre and author. */
export function LandingProjectCard({ project }: { project: LandingProject }) {
	const { t } = useTranslate();
	const meta = project.authorName
		? t("landing.strip.projectBy", "{genre} by {author}", {
				genre: project.genre ?? t("landing.strip.game", "A game"),
				author: project.authorName,
			})
		: project.genre;

	return (
		<Link href={`/project/${project.slug}`} className={styles.projectCard}>
			<div className={styles.projectCover}>
				{project.coverImage ? (
					<AppImage
						src={project.coverImage}
						alt={project.name}
						fill
						sizes="96px"
						className={styles.portraitImage}
					/>
				) : (
					// The generated cover's initials are drawn for a full-size card.
					<IconPhoto size={20} />
				)}
			</div>
			<div className={styles.info}>
				<Text strong ellipsis className={styles.name}>
					{project.name}
				</Text>
				{meta && (
					<Paragraph
						type="secondary"
						ellipsis={{ rows: 2 }}
						className={styles.meta}
					>
						{meta}
					</Paragraph>
				)}
			</div>
		</Link>
	);
}

/** Frame `YeoJA`: a specialist who just joined, shown by craft, not by name. */
export function LandingTalentCard({ talent }: { talent: LandingTalent }) {
	const { t } = useTranslate();
	const { icon } = getWorkDirection(talent.directionName);
	const level = skillLevelsList.find((item) => item.value === talent.level);

	return (
		<div className={styles.talentCard}>
			<IconTile icon={icon} direction={talent.directionName} size="lg" />
			<div className={styles.info}>
				<div className={styles.role}>
					<Text strong ellipsis className={styles.name}>
						{talent.specialityName}
					</Text>
					{level && <Tag className={styles.level}>{level.label}</Tag>}
				</div>
				{talent.weeklyHours !== null && (
					<Text type="secondary" ellipsis className={styles.meta}>
						{t(
							"landing.strip.weeklyHours",
							"Ready to invest about {hours, plural, one {# hour} other {# hours}} a week",
							{ hours: talent.weeklyHours },
						)}
					</Text>
				)}
			</div>
		</div>
	);
}

/** Frame `GomWQ`: a top expert, in the project cards' style. */
export function LandingExpertCard({ expert }: { expert: LandingExpert }) {
	const level = skillLevelsList.find((item) => item.value === expert.level);

	return (
		<Link href={`/expert/${expert.specialityId}`} className={styles.expertCard}>
			<div className={styles.portrait}>
				{expert.image && (
					<AppImage
						src={expert.image}
						alt={expert.name}
						fill
						sizes="(max-width: 575px) 264px, 304px"
						className={styles.portraitImage}
					/>
				)}
			</div>
			<div className={styles.expertInfo}>
				<Text strong className={styles.expertName}>
					{expert.name}
				</Text>
				<div className={styles.role}>
					<Text type="secondary" ellipsis>
						{expert.specialityName}
					</Text>
					{level && <Tag className={styles.level}>{level.label}</Tag>}
				</div>
				{expert.summary && (
					<Paragraph
						type="secondary"
						ellipsis={{ rows: 3 }}
						className={styles.bio}
					>
						{expert.summary}
					</Paragraph>
				)}
			</div>
		</Link>
	);
}
