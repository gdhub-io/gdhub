import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import {
	IconAward,
	IconBriefcase,
	IconClock,
	IconCopy,
	IconExternalLink,
	IconHistory,
	IconLock,
	IconMapPin,
	IconMessageCircle,
	IconPlayerPlay,
	IconRosetteDiscountCheck,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Modal,
	Popover,
	Skeleton,
	Tag,
	Tooltip,
	Typography,
	theme,
} from "antd";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useChat } from "@/components/Chat/useChat";
import { getWorkDirection } from "@/components/DirectionBadge";
import OfferPositionModal from "@/components/modals/OfferPositionModal";
import { useMyOpenPositions } from "@/hooks/useVacancyChat";
import styles from "./style.module.scss";

const { Paragraph, Text } = Typography;

type SpecialistProject = {
	id: string;
	name: string;
	slug: string | null;
	coverImage: string | null;
	description: string | null;
	videoLink: string | null;
	genre: string | null;
	role: string | null;
	status: string;
	startedAt: string | null;
	active: boolean;
};

type SpecialistCertificate = {
	number: string;
	issuedAt: string;
	event: {
		title: string;
		type: string;
		slug: string | null;
		image: string | null;
		organizerName: string | null;
	} | null;
};

type SpecialistData = prismaClient.Speciality & {
	availableProjects: (prismaClient.MatchingSpecialistAndProject & {
		project: { name: string };
	})[];
	direction: prismaClient.WorkDirection;
	user: {
		id: string;
		name: string | null;
		image: string | null;
		email: string | null;
		updatedAt: string;
		profile: prismaClient.Profile & { [key: string]: any };
	};
	projects: SpecialistProject[];
	certificates: SpecialistCertificate[];
	chat: { roomId: string } | null;
};

const formatDate = (value?: string | null) =>
	value
		? new Date(value).toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			})
		: "";

const matchColor = (percent: number, token: any) => {
	if (percent >= 80) return token.colorSuccess;
	if (percent >= 60) return token.colorWarning;
	return token.colorError;
};

// Keep the rail tidy for prolific members — active projects first, the rest
// behind a "show more" toggle.
const PROJECTS_LIMIT = 5;

// A darker shade of the header's direction tint — same hue, low lightness —
// used for the "Talent card" eyebrow so it reads as "the background, darker".
const darkenTint = (hex: string, lightness = 0.32) => {
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

const SpecialistPreviewModal = ({ specialistId, open, onCancel }: any) => {
	const { t } = useTranslate();
	const session: any = useSession();
	const { setSelectedRoomId, setOpenChatModal } = useChat();
	const [offerOpen, setOfferOpen] = useState(false);
	const [showAllProjects, setShowAllProjects] = useState(false);

	const { data: specialist, isLoading } = useQuery({
		queryKey: ["specialist", specialistId],
		queryFn: () =>
			axios
				.get<SpecialistData>("/api/specialist", {
					params: { id: specialistId },
				})
				.then((res) => res.data),
		// Cache briefly so profile edits propagate to other viewers, while
		// avoiding a refetch on every reopen within a few minutes.
		staleTime: 1000 * 60 * 5,
		enabled: open && !!specialistId,
	});

	// Offer is available to project authors who have open positions (and not on
	// their own card). Once the specialist accepted an offer, the CTA becomes
	// "Go to chat" instead.
	const { data: myPositions = [] } = useMyOpenPositions(
		open && !!session?.data,
	);

	const data = specialist;
	const isSelf = data?.user.id === session?.data?.user?.id;
	const acceptedRoomId = data?.chat?.roomId ?? null;
	const canOffer = myPositions.length > 0 && !!data && !isSelf;
	const emailRevealed = !!data?.user.email;

	const goToChat = () => {
		if (!acceptedRoomId) return;
		setSelectedRoomId(acceptedRoomId);
		setOpenChatModal(true);
		onCancel();
	};

	const direction = data?.direction?.name
		? getWorkDirection(data.direction.name)
		: null;
	const DirIcon = direction?.icon;

	const initials = (data?.user.name || data?.name || "?")
		.split(" ")
		.map((w: string) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	const timeForWork = data?.user.profile?.timeForWork;

	// Active memberships first, then the rest; collapse long lists.
	const sortedProjects = (data?.projects ?? [])
		.slice()
		.sort((a, b) => Number(b.active) - Number(a.active));
	const visibleProjects = showAllProjects
		? sortedProjects
		: sortedProjects.slice(0, PROJECTS_LIMIT);
	const hiddenProjectsCount = sortedProjects.length - visibleProjects.length;

	const renderTags = (value?: string | null, tone?: "pref") =>
		value
			? value.split(",").map((item, index) => (
					<Tag
						key={`tag-${index.toString()}`}
						className={tone === "pref" ? styles.prefTag : styles.tag}
					>
						{item.trim()}
					</Tag>
				))
			: null;

	const renderPreference = (items?: { name: string }[], tone?: "pref") =>
		(items ?? []).map((item, index) => (
			<Tag
				key={`pref-${index.toString()}`}
				className={tone === "pref" ? styles.prefTag : styles.tag}
			>
				{item.name}
			</Tag>
		));

	return (
		<Modal
			centered
			title={null}
			width={900}
			destroyOnHidden
			styles={{
				container: {
					padding: 0,
					border: "none",
					overflow: "hidden",
					borderRadius: 16,
				},
				body: { padding: 0 },
			}}
			mask={{ closable: false }}
			open={open}
			onCancel={onCancel}
			footer={null}
		>
			{isLoading && !data ? (
				<TalentCardSkeleton />
			) : (
				!!data && (
					<div className={styles.card}>
						{/* ---------- Header ---------- */}
						<div
							className={styles.header}
							style={{ background: direction?.color || "#F4F4F5" }}
						>
							<div
								className={styles.eyebrow}
								style={
									direction ? { color: darkenTint(direction.color) } : undefined
								}
							>
								{t("specialist.preview.cardType", "Talent card")}
							</div>

							<div className={styles.identity}>
								<div className={styles.avatar}>
									{data.user.image ? (
										// biome-ignore lint/performance/noImgElement: external avatar url
										<img
											src={data.user.image}
											alt={data.user.name || ""}
											className={styles.avatarImg}
										/>
									) : (
										<span>{initials}</span>
									)}
								</div>

								<div className={styles.identityText}>
									<div className={styles.nameRow}>
										<span className={styles.name}>
											{data.user.name || data.name}
										</span>
										{!!data.level && (
											<span className={styles.levelBadge}>{data.level}</span>
										)}
									</div>
									<div className={styles.roleRow}>
										{DirIcon && (
											<span className={styles.dirChip}>
												<DirIcon size={14} stroke={2} color="#18181B" />
											</span>
										)}
										<span className={styles.role}>{data.name}</span>
										{data.direction?.name && (
											<span className={styles.roleMuted}>
												· {data.direction.name}
											</span>
										)}
									</div>
								</div>
							</div>

							<div className={styles.metaRow}>
								<div className={styles.metaLeft}>
									{!!data.user.profile?.country && (
										<span className={styles.pill}>
											<IconMapPin size={14} className={styles.pillIcon} />
											{[data.user.profile.country, data.user.profile.city]
												.filter(Boolean)
												.join(", ")}
										</span>
									)}
									{Array.isArray(timeForWork) && (
										<span className={styles.pill}>
											<IconClock size={14} className={styles.pillIcon} />
											{t("fromTo", "from {fromDate} to {toDate} hours a week", {
												fromDate: timeForWork[0],
												toDate: timeForWork[1],
											})}
										</span>
									)}
								</div>

								{acceptedRoomId ? (
									<button
										type="button"
										className={styles.offerBtn}
										onClick={goToChat}
									>
										<IconMessageCircle size={15} />
										{t("specialist.preview.goToChat", "Go to chat")}
									</button>
								) : (
									canOffer && (
										<button
											type="button"
											className={styles.offerBtn}
											onClick={() => setOfferOpen(true)}
										>
											<IconBriefcase size={15} />
											{t(
												"specialist.preview.offerPosition",
												"Offer a position",
											)}
										</button>
									)
								)}
							</div>
						</div>

						{/* ---------- Body ---------- */}
						<div className={styles.body}>
							{/* Left rail */}
							<div className={styles.leftRail}>
								<div className={styles.railLabel}>
									{t("specialist.preview.contacts", "Contacts")}
								</div>

								<div className={styles.field}>
									<span className={styles.fieldLabel}>
										{t("specialist.preview.email", "Email")}
									</span>
									{emailRevealed ? (
										<div className={styles.valueBox}>
											<span className={styles.valueText}>
												{data.user.email}
											</span>
											<Text
												className={styles.copyBtn}
												copyable={{
													icon: (
														<IconCopy size={14} className={styles.copyIcon} />
													),
													tooltips: false,
													text: data.user.email || "",
												}}
											/>
										</div>
									) : (
										<Tooltip
											title={t(
												"specialist.preview.emailLocked",
												"The email becomes visible after the specialist accepts your offer.",
											)}
										>
											<div
												className={`${styles.valueBox} ${styles.valueLocked}`}
											>
												<span
													className={`${styles.valueText} ${styles.blurred}`}
												>
													contact.hidden@gdhub.io
												</span>
												<IconLock size={14} className={styles.lockIcon} />
											</div>
										</Tooltip>
									)}
								</div>

								{!!data.portfolioUrl && (
									<>
										<div className={styles.railLabel}>
											{t("specialist.preview.links", "Links")}
										</div>
										<Link
											href={data.portfolioUrl}
											target="_blank"
											className={styles.portfolioBtn}
										>
											<IconExternalLink size={15} />
											{t(
												"specialist.preview.summaryPortfolio",
												"Summary / Portfolio",
											)}
										</Link>
									</>
								)}

								{sortedProjects.length > 0 && (
									<>
										<div className={styles.railLabel}>
											{t("specialist.preview.projects", "Projects")}
										</div>
										{visibleProjects.map((project) => (
											<ProjectMiniCard
												key={project.id}
												project={project}
												t={t}
											/>
										))}
										{hiddenProjectsCount > 0 && (
											<button
												type="button"
												className={styles.moreBtn}
												onClick={() => setShowAllProjects(true)}
											>
												{t("specialist.preview.showMore", "Show {count} more", {
													count: hiddenProjectsCount,
												})}
											</button>
										)}
									</>
								)}

								{data.certificates.length > 0 && (
									<>
										<div className={styles.railLabel}>
											{t("specialist.preview.certificates", "Certificates")}
										</div>
										{data.certificates.map((cert) => (
											<CertificateMiniCard
												key={cert.number}
												cert={cert}
												t={t}
											/>
										))}
									</>
								)}
							</div>

							{/* Right content */}
							<div className={styles.rightContent}>
								{!!data.user.profile?.about && (
									<div className={styles.contentCard}>
										<div className={styles.cardTitle}>
											{t("specialist.preview.aboutMe", "About")}
										</div>
										<Paragraph className={styles.para}>
											{data.user.profile.about}
										</Paragraph>
									</div>
								)}

								<div className={styles.contentCard}>
									<div className={styles.cardTitle}>
										{t(
											"specialist.preview.professionalInfo",
											"Professional info",
										)}
									</div>
									<div className={styles.proGrid}>
										<Field
											label={t(
												"specialist.preview.specialization",
												"Specialization",
											)}
											value={data.specialization}
										/>
										<Field
											label={t("specialist.preview.experience", "Experience")}
											value={data.jobs}
										/>
										<Field
											label={t(
												"specialist.preview.iUseItInWork",
												"I use in work",
											)}
											value={data.tools}
										/>
										<Field
											label={t(
												"specialist.preview.whereIReceivedKnowledge",
												"Education",
											)}
											value={data.schools}
										/>
									</div>
									{!!data.skills && (
										<div className={styles.tagBlock}>
											<span className={styles.fieldLabel}>
												{t("specialist.preview.skills", "Skills")}
											</span>
											<div className={styles.tagRow}>
												{renderTags(data.skills)}
											</div>
										</div>
									)}
								</div>

								{(data.user.profile?.preferredGenres?.length > 0 ||
									data.user.profile?.preferredSettings?.length > 0 ||
									data.user.profile?.preferredLevels?.length > 0) && (
									<div className={styles.contentCard}>
										<div className={styles.cardTitle}>
											{t(
												"specialist.preview.preferencesInGames",
												"Preferences in games",
											)}
										</div>
										{data.user.profile.preferredGenres?.length > 0 && (
											<PrefGroup
												label={t(
													"specialist.preview.iPreferGenres",
													"Favorite genres",
												)}
											>
												{renderPreference(
													data.user.profile.preferredGenres,
													"pref",
												)}
											</PrefGroup>
										)}
										{data.user.profile.preferredSettings?.length > 0 && (
											<PrefGroup
												label={t(
													"specialist.preview.iPreferGameSettings",
													"Settings",
												)}
											>
												{renderPreference(
													data.user.profile.preferredSettings,
													"pref",
												)}
											</PrefGroup>
										)}
										{data.user.profile.preferredLevels?.length > 0 && (
											<PrefGroup
												label={t(
													"specialist.preview.iPreferGamesOfTheFollowingComplexity",
													"Complexity",
												)}
											>
												{renderPreference(
													data.user.profile.preferredLevels,
													"pref",
												)}
											</PrefGroup>
										)}
									</div>
								)}

								{data.availableProjects?.map((record) => (
									<MatchCard key={record.id} record={record} t={t} />
								))}
							</div>
						</div>

						{/* ---------- Footer ---------- */}
						<div className={styles.footer}>
							<span className={styles.footerNote}>
								<IconHistory size={14} />
								{t("specialist.preview.lastUpdated", "Last updated")}{" "}
								{formatDate(data.user.updatedAt)}
							</span>
						</div>
					</div>
				)
			)}

			<OfferPositionModal
				open={offerOpen}
				candidateUserId={data?.user.id}
				onClose={() => setOfferOpen(false)}
			/>
		</Modal>
	);
};

/* ---------- subcomponents ---------- */

// Loading placeholder mirroring the talent-card layout (header + rail + cards).
const skInput = (width: number, height: number, block?: boolean) => (
	<Skeleton.Input
		active
		size="small"
		block={block}
		style={
			block
				? { height, borderRadius: 8 }
				: { width, minWidth: width, height, borderRadius: 6 }
		}
	/>
);

const TalentCardSkeleton = () => (
	<div className={styles.card}>
		<div className={styles.header} style={{ background: "#F4F4F5" }}>
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

const Field = ({ label, value }: { label: string; value?: string | null }) =>
	value ? (
		<div className={styles.proField}>
			<span className={styles.fieldLabel}>{label}</span>
			<span className={styles.fieldValue}>{value}</span>
		</div>
	) : null;

const PrefGroup = ({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) => (
	<div className={styles.prefGroup}>
		<span className={styles.fieldLabel}>{label}</span>
		<div className={styles.tagRow}>{children}</div>
	</div>
);

const ProjectMiniCard = ({
	project,
	t,
}: {
	project: SpecialistProject;
	t: any;
}) => (
	<Popover
		trigger="click"
		placement="right"
		classNames={{ root: styles.popoverRoot }}
		content={<ProjectPreview project={project} t={t} />}
	>
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
	</Popover>
);

const ProjectPreview = ({
	project,
	t,
}: {
	project: SpecialistProject;
	t: any;
}) => (
	<div className={styles.projectPop}>
		<div
			className={styles.ppCover}
			style={
				project.coverImage
					? { backgroundImage: `url(${project.coverImage})` }
					: undefined
			}
		>
			<span className={styles.ppTitle}>{project.name}</span>
		</div>
		<div className={styles.ppBody}>
			<div className={styles.ppChips}>
				{!!project.genre && <Tag className={styles.tag}>{project.genre}</Tag>}
				<Tag className={project.active ? styles.tagActive : styles.tag}>
					{project.active
						? t("specialist.preview.active", "Active")
						: t("specialist.preview.past", "Past")}
				</Tag>
			</div>
			{!!project.description && (
				<Paragraph className={styles.ppDesc} ellipsis={{ rows: 4 }}>
					{project.description}
				</Paragraph>
			)}
			{!!project.videoLink && (
				<Link
					href={project.videoLink}
					target="_blank"
					className={styles.ppVideoBtn}
				>
					<IconPlayerPlay size={14} />
					{t("specialist.preview.watchVideo", "Watch video")}
				</Link>
			)}
			{!!project.role && (
				<div className={styles.ppRole}>
					<span className={styles.fieldLabel}>
						{t("specialist.preview.roleInProject", "Role")}
					</span>
					<span className={styles.fieldValue}>{project.role}</span>
				</div>
			)}
		</div>
	</div>
);

const CertificateMiniCard = ({
	cert,
	t,
}: {
	cert: SpecialistCertificate;
	t: any;
}) => (
	<Tooltip
		placement="right"
		title={
			<div className={styles.certTip}>
				<div className={styles.certTipTitle}>
					{cert.event?.title ||
						t("specialist.preview.certificate", "Certificate")}
				</div>
				<div className={styles.certTipRow}>
					{t("specialist.preview.issued", "Issued")} {formatDate(cert.issuedAt)}
				</div>
				{!!cert.event?.organizerName && (
					<div className={styles.certTipRow}>{cert.event.organizerName}</div>
				)}
				<div className={styles.certTipCode}>№ {cert.number}</div>
			</div>
		}
	>
		<div className={styles.miniCard}>
			<span className={styles.certThumb}>
				<IconAward size={18} color="#B45309" />
			</span>
			<span className={styles.miniText}>
				<span className={styles.miniTitle}>
					{cert.event?.title ||
						t("specialist.preview.certificate", "Certificate")}
				</span>
				<span className={styles.miniSubVerified}>
					<IconRosetteDiscountCheck size={13} color="#16A34A" />
					{t("specialist.preview.verified", "Verified")} ·{" "}
					{new Date(cert.issuedAt).getFullYear()}
				</span>
			</span>
		</div>
	</Tooltip>
);

const MatchCard = ({ record, t }: { record: any; t: any }) => {
	const { token } = theme.useToken();
	const bars = [
		{
			label: t(
				"specialist.preview.complianceWithTheProject",
				"Compliance with the project",
			),
			value: record.projectScore,
		},
		{
			label: t(
				"specialist.preview.complianceWithTheAuthor",
				"Compliance with the author",
			),
			value: record.authorScore,
		},
		{
			label: t(
				"specialist.preview.complianceWithTheTeam",
				"Compliance with the team",
			),
			value: record.teamScore,
		},
	];

	return (
		<div className={styles.contentCard}>
			<div className={styles.matchHeader}>
				<div>
					<div className={styles.cardTitle}>
						{t("specialist.preview.projectMatch", "Project match")}
					</div>
					<div className={styles.matchSub}>{record.project.name}</div>
				</div>
				<span
					className={styles.matchPill}
					style={{
						background: `${matchColor(record.avgScore, token)}1A`,
						color: matchColor(record.avgScore, token),
					}}
				>
					{record.avgScore}% {t("specialist.preview.match", "match")}
				</span>
			</div>
			{bars.map((bar) => (
				<div key={bar.label} className={styles.bar}>
					<div className={styles.barTop}>
						<span className={styles.barLabel}>{bar.label}</span>
						<span className={styles.barValue}>{bar.value}%</span>
					</div>
					<div className={styles.barTrack}>
						<span
							className={styles.barFill}
							style={{
								width: `${bar.value}%`,
								background: matchColor(bar.value, token),
							}}
						/>
					</div>
				</div>
			))}
			{!!record.summary && (
				<div className={styles.comment}>
					<span className={styles.fieldLabel}>
						{t("specialist.preview.comment", "Comment")}
					</span>
					<Paragraph className={styles.para}>{record.summary}</Paragraph>
				</div>
			)}
		</div>
	);
};

export default SpecialistPreviewModal;
