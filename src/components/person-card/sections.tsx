"use client";

import {
	IconClock,
	IconCopy,
	IconExternalLink,
	IconHistory,
	IconMapPin,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Skeleton, Tag, Typography } from "antd";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { getWorkDirection } from "@/components/DirectionBadge";
import { avatarImage } from "@/helpers/image";
import {
	CertificateMiniCard,
	darkenTint,
	Field,
	type PersonCardCertificate,
	type PersonCardProject,
	PROJECTS_LIMIT,
	ProjectMiniCard,
	SkillTags,
	toExternalUrl,
	toInitials,
} from ".";
import styles from "./style.module.scss";

/**
 * The parts the talent card (03.10) and the candidate card (04.07) share. Each
 * part renders only what it is handed: the two cards read different endpoints
 * on purpose, so a field one of them must not show can never leak through a
 * shared data shape.
 */

const { Paragraph, Text } = Typography;

export function PersonCardHeader({
	eyebrow,
	image,
	name,
	level,
	role,
	directionName,
	location,
	timeForWork,
	action,
}: {
	eyebrow: string;
	image: string | null;
	name: string;
	level?: string | null;
	role: string;
	directionName?: string | null;
	location?: string | null;
	timeForWork?: unknown;
	action?: ReactNode;
}) {
	const { t } = useTranslate();
	const direction = directionName ? getWorkDirection(directionName) : null;
	const DirIcon = direction?.icon;

	return (
		<div
			className={styles.header}
			style={{
				background: direction?.color || "var(--gd-color-surface-sunken)",
			}}
		>
			<div
				className={styles.eyebrow}
				style={direction ? { color: darkenTint(direction.color) } : undefined}
			>
				{eyebrow}
			</div>

			<div className={styles.identity}>
				<div className={styles.avatar}>
					{image ? (
						// biome-ignore lint/performance/noImgElement: external avatar url
						<img
							src={avatarImage(image, 76)}
							alt={name}
							className={styles.avatarImg}
						/>
					) : (
						<span>{toInitials(name)}</span>
					)}
				</div>

				<div className={styles.identityText}>
					<div className={styles.nameRow}>
						<span className={styles.name}>{name}</span>
						{!!level && <span className={styles.levelBadge}>{level}</span>}
					</div>
					<div className={styles.roleRow}>
						{DirIcon && (
							<span className={styles.dirChip}>
								<DirIcon size={14} stroke={2} color={direction?.ink} />
							</span>
						)}
						<span className={styles.role}>{role}</span>
						{!!directionName && (
							<span className={styles.roleMuted}>· {directionName}</span>
						)}
					</div>
				</div>
			</div>

			<div className={styles.metaRow}>
				<div className={styles.metaLeft}>
					{!!location && (
						<span className={styles.pill}>
							<IconMapPin size={14} className={styles.pillIcon} />
							{location}
						</span>
					)}
					{Array.isArray(timeForWork) && timeForWork.length === 2 && (
						<span className={styles.pill}>
							<IconClock size={14} className={styles.pillIcon} />
							{t("fromTo", "from {fromDate} to {toDate} hours a week", {
								fromDate: timeForWork[0],
								toDate: timeForWork[1],
							})}
						</span>
					)}
				</div>
				{action}
			</div>
		</div>
	);
}

export const RailLabel = ({ children }: { children: ReactNode }) => (
	<div className={styles.railLabel}>{children}</div>
);

/** A contact the viewer may use, with copy. */
export const ContactField = ({
	label,
	value,
	href,
}: {
	label: string;
	value: string;
	href?: string;
}) => (
	<div className={styles.field}>
		<span className={styles.fieldLabel}>{label}</span>
		<div className={styles.valueBox}>
			{href ? (
				<Link
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className={styles.valueText}
				>
					{value}
				</Link>
			) : (
				<span className={styles.valueText}>{value}</span>
			)}
			<Text
				className={styles.copyBtn}
				copyable={{
					icon: <IconCopy size={14} className={styles.copyIcon} />,
					tooltips: false,
					text: value,
				}}
			/>
		</div>
	</div>
);

export function PortfolioLink({ url }: { url?: string | null }) {
	const { t } = useTranslate();
	if (!url) return null;
	return (
		<>
			<RailLabel>{t("specialist.preview.links", "Links")}</RailLabel>
			<Link
				href={toExternalUrl(url)}
				target="_blank"
				rel="noopener noreferrer"
				className={styles.portfolioBtn}
			>
				<IconExternalLink size={15} />
				{t("specialist.preview.summaryPortfolio", "Summary / Portfolio")}
			</Link>
		</>
	);
}

/** Active memberships first, the rest behind "show more". */
export function ProjectsRail({ projects }: { projects: PersonCardProject[] }) {
	const { t } = useTranslate();
	const [showAll, setShowAll] = useState(false);
	if (!projects.length) return null;

	const sorted = projects
		.slice()
		.sort((a, b) => Number(b.active) - Number(a.active));
	const visible = showAll ? sorted : sorted.slice(0, PROJECTS_LIMIT);
	const hidden = sorted.length - visible.length;

	return (
		<>
			<RailLabel>{t("specialist.preview.projects", "Projects")}</RailLabel>
			{visible.map((project) => (
				<ProjectMiniCard key={project.id} project={project} t={t} />
			))}
			{hidden > 0 && (
				<button
					type="button"
					className={styles.moreBtn}
					onClick={() => setShowAll(true)}
				>
					{t("specialist.preview.showMore", "Show {count} more", {
						count: hidden,
					})}
				</button>
			)}
		</>
	);
}

export function CertificatesRail({
	certificates,
}: {
	certificates: PersonCardCertificate[];
}) {
	const { t } = useTranslate();
	if (!certificates.length) return null;
	return (
		<>
			<RailLabel>
				{t("specialist.preview.certificates", "Certificates")}
			</RailLabel>
			{certificates.map((cert) => (
				<CertificateMiniCard key={cert.number} cert={cert} t={t} />
			))}
		</>
	);
}

export const ContentCard = ({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) => (
	<div className={styles.contentCard}>
		<div className={styles.cardTitle}>{title}</div>
		{children}
	</div>
);

export function AboutCard({ about }: { about?: string | null }) {
	const { t } = useTranslate();
	if (!about) return null;
	return (
		<ContentCard title={t("specialist.preview.aboutMe", "About")}>
			<Paragraph className={styles.para}>{about}</Paragraph>
		</ContentCard>
	);
}

export type ProfessionalInfo = {
	specialization?: string | null;
	jobs?: string | null;
	tools?: string | null;
	schools?: string | null;
	skills?: string | null;
};

export function ProfessionalInfoCard({ info }: { info: ProfessionalInfo }) {
	const { t } = useTranslate();
	return (
		<ContentCard
			title={t("specialist.preview.professionalInfo", "Professional info")}
		>
			<div className={styles.proGrid}>
				<Field
					label={t("specialist.preview.specialization", "Specialization")}
					value={info.specialization}
				/>
				<Field
					label={t("specialist.preview.experience", "Experience")}
					value={info.jobs}
				/>
				<Field
					label={t("specialist.preview.iUseItInWork", "I use in work")}
					value={info.tools}
				/>
				<Field
					label={t("specialist.preview.whereIReceivedKnowledge", "Education")}
					value={info.schools}
				/>
			</div>
			{!!info.skills && (
				<div className={styles.tagBlock}>
					<span className={styles.fieldLabel}>
						{t("specialist.preview.skills", "Skills")}
					</span>
					<div className={styles.tagRow}>
						<SkillTags value={info.skills} />
					</div>
				</div>
			)}
		</ContentCard>
	);
}

const PrefGroup = ({
	label,
	items,
}: {
	label: string;
	items?: { name: string }[];
}) =>
	items?.length ? (
		<div className={styles.prefGroup}>
			<span className={styles.fieldLabel}>{label}</span>
			<div className={styles.tagRow}>
				{items.map((item, index) => (
					<Tag key={`pref-${index.toString()}`} className={styles.prefTag}>
						{item.name}
					</Tag>
				))}
			</div>
		</div>
	) : null;

export function PreferencesCard({
	genres,
	settings,
	levels,
}: {
	genres?: { name: string }[];
	settings?: { name: string }[];
	levels?: { name: string }[];
}) {
	const { t } = useTranslate();
	if (!genres?.length && !settings?.length && !levels?.length) return null;
	return (
		<ContentCard
			title={t("specialist.preview.preferencesInGames", "Preferences in games")}
		>
			<PrefGroup
				label={t("specialist.preview.iPreferGenres", "Favorite genres")}
				items={genres}
			/>
			<PrefGroup
				label={t("specialist.preview.iPreferGameSettings", "Settings")}
				items={settings}
			/>
			<PrefGroup
				label={t(
					"specialist.preview.iPreferGamesOfTheFollowingComplexity",
					"Complexity",
				)}
				items={levels}
			/>
		</ContentCard>
	);
}

export const PersonCardFooter = ({ children }: { children: ReactNode }) => (
	<div className={styles.footer}>
		<span className={styles.footerNote}>
			<IconHistory size={14} />
			{children}
		</span>
	</div>
);

const skInput = (width: number, height: number, block?: boolean) => (
	<Skeleton.Input
		active
		size="small"
		block={block}
		style={
			block
				? { height, borderRadius: 8 }
				: {
						width,
						minWidth: width,
						height,
						borderRadius: "var(--gd-radius-chip)",
					}
		}
	/>
);

/** Loading placeholder mirroring the card's layout (header + rail + cards). */
export const PersonCardSkeleton = () => (
	<div className={styles.card}>
		<div
			className={styles.header}
			style={{ background: "var(--gd-color-surface-sunken)" }}
		>
			{skInput(90, 12)}
			<div className={styles.identity}>
				<Skeleton.Avatar
					active
					shape="square"
					size={76}
					style={{ borderRadius: 18 }}
				/>
				<div className={styles.identityText}>
					{skInput(220, 26)}
					{skInput(160, 16)}
				</div>
			</div>
			<div className={styles.metaRow}>
				<div className={styles.metaLeft}>
					<Skeleton.Button active size="small" style={{ width: 150 }} />
					<Skeleton.Button active size="small" style={{ width: 130 }} />
				</div>
				<Skeleton.Button active style={{ width: 150 }} />
			</div>
		</div>

		<div className={styles.body}>
			<div className={styles.leftRail}>
				{skInput(70, 12)}
				{skInput(0, 40, true)}
				{skInput(70, 12)}
				{[0, 1, 2].map((i) => (
					<div key={`sk-mini-${i}`} className={styles.skMiniCard}>
						<Skeleton.Avatar
							active
							shape="square"
							size={40}
							style={{ borderRadius: 8 }}
						/>
						<div className={styles.miniText}>
							{skInput(120, 13)}
							{skInput(80, 12)}
						</div>
					</div>
				))}
			</div>

			<div className={styles.rightContent}>
				{[0, 1].map((i) => (
					<div key={`sk-card-${i}`} className={styles.contentCard}>
						<Skeleton active title={{ width: 140 }} paragraph={{ rows: 3 }} />
					</div>
				))}
			</div>
		</div>

		<div className={styles.footer}>{skInput(160, 12)}</div>
	</div>
);

/** The modal shell both cards sit in: borderless, clipped to the panel radius. */
export const PERSON_CARD_MODAL_STYLES = {
	container: {
		padding: 0,
		border: "none",
		overflow: "hidden",
		borderRadius: "var(--gd-radius-panel)",
	},
	body: { padding: 0 },
} as const;
