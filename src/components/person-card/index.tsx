import {
	IconArrowUpRight,
	IconAward,
	IconPlayerPlayFilled,
	IconRosetteDiscountCheck,
	IconShieldCheck,
} from "@tabler/icons-react";
import { Popover, Tag, Typography } from "antd";
import Link from "next/link";
import type React from "react";
import { ProjectVideoCover } from "@/components/project/ProjectVideoCover";
import { ProjectStatus } from "@/config/prisma-enums";
import styles from "./style.module.scss";

const { Paragraph } = Typography;

/**
 * The pieces a person's card is drawn from.
 *
 * The talent card and the expert card show the same person and differ only in
 * what they ask for at the end, so the rail rows, their compact popovers and
 * the field grid live here instead of in one of the two modals.
 */

export type PersonCardProject = {
	id: string;
	name: string;
	slug: string | null;
	coverImage: string | null;
	description: string | null;
	videoLink: string | null;
	genre: string | null;
	platform: string | null;
	projectStatus: ProjectStatus;
	author: { name: string | null; image: string | null } | null;
	teamSize: number;
	role: string | null;
	status: string;
	startedAt: string | null;
	finishedAt: string | null;
	active: boolean;
};

export type PersonCardCertificate = {
	number: string;
	issuedAt: string;
	mentors: string[];
	event: {
		title: string;
		type: string;
		slug: string | null;
		image: string | null;
		organizerName: string | null;
	} | null;
};

export const toExternalUrl = (url: string) =>
	/^https?:\/\//i.test(url) ? url : `https://${url}`;

export const formatDate = (value?: string | null) =>
	value
		? new Date(value).toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			})
		: "";

export const formatMonth = (value?: string | null) =>
	value
		? new Date(value).toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
			})
		: "";

export const toInitials = (name?: string | null) =>
	(name || "?")
		.split(" ")
		.map((word: string) => word[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

// Project lifecycle → the badge shown on the compact project card. Everything
// that is neither released nor shut down reads as "in development".
export const projectStatusLabel = (status: ProjectStatus, t: any) => {
	switch (status) {
		case ProjectStatus.Released:
			return t("specialist.preview.statusReleased", "Released");
		case ProjectStatus.Archived:
			return t("specialist.preview.statusArchived", "Archived");
		case ProjectStatus.Dormant:
			return t("specialist.preview.statusDormant", "On hold");
		case ProjectStatus.KilledWithDignity:
			return t("specialist.preview.statusClosed", "Closed");
		default:
			return t("specialist.preview.statusInDevelopment", "In development");
	}
};

export const PROJECTS_LIMIT = 5;

// The compact cards paint their own cover/banner edge to edge, so the popover
// shell must not add padding of its own.
const CARD_POPOVER_STYLES = {
	container: { padding: 0, borderRadius: 14, overflow: "hidden" },
	content: { padding: 0 },
} as const;

// Shared shell for the compact cards opened from the left rail. `destroyOnHidden`
// unmounts the card on close, so a reopened one starts from a clean state.
export const CardPopover = ({
	content,
	children,
}: {
	content: React.ReactNode;
	children: React.ReactNode;
}) => (
	<Popover
		trigger="click"
		placement="right"
		destroyOnHidden
		styles={CARD_POPOVER_STYLES}
		content={content}
	>
		{children}
	</Popover>
);

// A darker shade of the header's direction tint — same hue, low lightness —
// used for the "Talent card" eyebrow so it reads as "the background, darker".
export const darkenTint = (hex: string, lightness = 0.32) => {
	const clean = hex.replace("#", "");
	if (clean.length < 6) return hex;
	const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
	const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
	const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	let h = 0;
	let s = 0;
	if (d !== 0) {
		s = d / (1 - Math.abs(2 * l - 1));
		if (max === r) h = ((((g - b) / d) % 6) + 6) % 6;
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h *= 60;
	}
	const sat = s < 0.1 ? 0 : Math.min(1, s + 0.2);
	return `hsl(${Math.round(h)}, ${Math.round(sat * 100)}%, ${Math.round(lightness * 100)}%)`;
};

/** Skills and tools arrive as one comma-separated string. */
export const SkillTags = ({ value }: { value?: string | null }) =>
	value ? (
		<>
			{value.split(",").map((item) => (
				<Tag key={item.trim()} className={styles.tag}>
					{item.trim()}
				</Tag>
			))}
		</>
	) : null;

export const Field = ({
	label,
	value,
}: {
	label: string;
	value?: string | null;
}) =>
	value ? (
		<div className={styles.proField}>
			<span className={styles.fieldLabel}>{label}</span>
			<span className={styles.fieldValue}>{value}</span>
		</div>
	) : null;

export const ProjectMiniCard = ({
	project,
	t,
}: {
	project: PersonCardProject;
	t: any;
}) => (
	<CardPopover content={<ProjectPreview project={project} t={t} />}>
		<button type="button" className={styles.miniCard}>
			<span
				className={styles.miniCover}
				style={
					project.coverImage
						? { backgroundImage: `url(${project.coverImage})` }
						: undefined
				}
			/>
			<span className={styles.miniText}>
				<span className={styles.miniTitle}>{project.name}</span>
				{!!project.role && (
					<span className={styles.miniSub}>{project.role}</span>
				)}
			</span>
		</button>
	</CardPopover>
);

// Compact project card ("Popover — Project"). Public-facing: no equity, cap
// table or other author/scout-only data. The participation block is rendered
// only when the viewed user actually has a role in the project.
const ProjectPreview = ({
	project,
	t,
}: {
	project: PersonCardProject;
	t: any;
}) => {
	const authorName = project.author?.name;
	const period = [
		formatMonth(project.startedAt),
		project.finishedAt
			? formatMonth(project.finishedAt)
			: t("specialist.preview.present", "Present"),
	]
		.filter(Boolean)
		.join(" — ");

	return (
		<div className={styles.projectPop}>
			<ProjectVideoCover
				className={styles.ppCover}
				coverImage={project.coverImage}
				videoLink={project.videoLink}
				alt={project.name}
				renderPlay={(play) => (
					<button type="button" className={styles.ppPitchBtn} onClick={play}>
						<IconPlayerPlayFilled size={11} />
						{t("specialist.preview.watchPitch", "Watch pitch")}
					</button>
				)}
			>
				<span className={styles.ppTitleBar}>
					<span className={styles.ppTitle}>{project.name}</span>
				</span>
			</ProjectVideoCover>
			<div className={styles.ppBody}>
				<div className={styles.ppChips}>
					<Tag className={styles.ppStatusTag}>
						{projectStatusLabel(project.projectStatus, t)}
					</Tag>
					{!!project.genre && <Tag className={styles.tag}>{project.genre}</Tag>}
					{!!project.platform && (
						<Tag className={styles.tag}>{project.platform}</Tag>
					)}
				</div>

				{!!project.description && (
					<Paragraph className={styles.ppDesc} ellipsis={{ rows: 6 }}>
						{project.description}
					</Paragraph>
				)}

				{(!!authorName || project.teamSize > 0) && (
					<>
						<div className={styles.ppSep} />
						<div className={styles.ppBox}>
							<div className={styles.ppBoxTop}>
								<span className={styles.ppBoxLabel}>
									{t("specialist.preview.author", "Author")}
								</span>
								{project.teamSize > 0 && (
									<span className={styles.ppTeam}>
										<span className={styles.ppTeamLabel}>
											{t("specialist.preview.teamSize", "Team size")}
										</span>
										<span className={styles.ppTeamValue}>
											{project.teamSize}
										</span>
									</span>
								)}
							</div>
							{!!authorName && (
								<div className={styles.ppAuthor}>
									<span className={styles.ppAvatar}>
										{project.author?.image ? (
											// biome-ignore lint/performance/noImgElement: external avatar url
											<img
												src={project.author.image}
												alt={authorName}
												className={styles.ppAvatarImg}
											/>
										) : (
											toInitials(authorName)
										)}
									</span>
									<span className={styles.ppAuthorName}>{authorName}</span>
								</div>
							)}
						</div>
					</>
				)}

				{!!project.role && (
					<>
						<div className={styles.ppSep} />
						<div className={styles.ppBox}>
							<div className={styles.ppBoxTop}>
								<span className={styles.ppBoxLabel}>
									{t("specialist.preview.imThere", "I'm there")}
								</span>
								{!!period && <span className={styles.ppPeriod}>{period}</span>}
							</div>
							<span className={styles.ppRoleValue}>{project.role}</span>
						</div>
					</>
				)}

				{!!project.slug && (
					<Link
						href={`/project/${project.slug}`}
						target="_blank"
						className={styles.ppViewBtn}
					>
						{t("specialist.preview.viewProject", "View project")}
						<IconArrowUpRight size={14} />
					</Link>
				)}
			</div>
		</div>
	);
};

export const CertificateMiniCard = ({
	cert,
	t,
}: {
	cert: PersonCardCertificate;
	t: any;
}) => (
	<CardPopover content={<CertificatePreview cert={cert} t={t} />}>
		<button type="button" className={styles.miniCard}>
			<span className={styles.certThumb}>
				<IconAward size={18} color="var(--gd-warning-solid)" />
			</span>
			<span className={styles.miniText}>
				<span className={styles.miniTitle}>
					{cert.event?.title ||
						t("specialist.preview.certificate", "Certificate")}
				</span>
				<span className={styles.miniSubVerified}>
					<IconRosetteDiscountCheck size={13} color="var(--gd-success-solid)" />
					{t("specialist.preview.verified", "Verified")} ·{" "}
					{new Date(cert.issuedAt).getFullYear()}
				</span>
			</span>
		</button>
	</CardPopover>
);

// Compact certificate card ("Popover — Certificate") — registry proof plus a
// link to the public verification page.
const CertificatePreview = ({
	cert,
	t,
}: {
	cert: PersonCardCertificate;
	t: any;
}) => {
	const title =
		cert.event?.title || t("specialist.preview.certificate", "Certificate");

	return (
		<div className={styles.certPop}>
			<div className={styles.certBanner}>
				<span className={styles.certBannerIcon}>
					<IconShieldCheck size={18} color="var(--gd-success-solid)" />
				</span>
				<span className={styles.certBannerText}>
					<span className={styles.certBannerTitle}>
						{t(
							"specialist.preview.verifiedCertificate",
							"Verified certificate",
						)}
					</span>
					<span className={styles.certBannerSub}>
						{t(
							"specialist.preview.foundInRegistry",
							"Found in the gdhub registry",
						)}
					</span>
				</span>
			</div>

			<div className={styles.certBody}>
				<div className={styles.certHead}>
					<span
						className={styles.certCover}
						style={
							cert.event?.image
								? { backgroundImage: `url(${cert.event.image})` }
								: undefined
						}
					>
						{!cert.event?.image && (
							<IconAward size={22} color="var(--gd-neutral-600)" />
						)}
					</span>
					<span className={styles.certHeadText}>
						<span className={styles.certTitle}>{title}</span>
						{!!cert.event?.type && (
							<span className={styles.certSub}>
								{cert.event.type} ·{" "}
								{t("specialist.preview.participant", "Participant")}
							</span>
						)}
					</span>
				</div>

				<div className={styles.certGrid}>
					<CertField
						label={t("specialist.preview.issued", "Issued")}
						value={formatDate(cert.issuedAt)}
					/>
					<CertField
						label={t("specialist.preview.certificateNumber", "Certificate №")}
						value={cert.number}
					/>
					<CertField
						label={t("specialist.preview.organizer", "Organizer")}
						value={cert.event?.organizerName}
					/>
					<CertField
						label={t("specialist.preview.mentor", "Mentor")}
						value={cert.mentors?.join(", ")}
					/>
				</div>

				<div className={styles.ppSep} />

				<Link
					href={`/verify/${cert.number}`}
					target="_blank"
					className={styles.ppViewBtn}
				>
					{t("specialist.preview.viewCertificate", "View certificate")}
					<IconArrowUpRight size={14} />
				</Link>
			</div>
		</div>
	);
};

const CertField = ({
	label,
	value,
}: {
	label: string;
	value?: string | null;
}) =>
	value ? (
		<div className={styles.certField}>
			<span className={styles.certFieldLabel}>{label}</span>
			<span className={styles.certFieldValue}>{value}</span>
		</div>
	) : null;
