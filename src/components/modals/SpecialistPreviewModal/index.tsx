import type {
	MatchingSpecialistAndProject,
	Profile,
	Speciality,
	WorkDirection,
} from "@gdhub-io/gdhub-prisma";
import {
	IconBriefcase,
	IconCopy,
	IconLock,
	IconMessageCircle,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Modal, Tag, Tooltip, Typography, theme } from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useChat } from "@/components/Chat/useChat";
import { getWorkDirection } from "@/components/DirectionBadge";
import OfferPositionModal from "@/components/modals/OfferPositionModal";
import {
	formatDate,
	type PersonCardCertificate,
	type PersonCardProject,
	PROJECTS_LIMIT,
	toInitials,
} from "@/components/person-card";
import {
	AboutCard,
	CertificatesRail,
	PERSON_CARD_MODAL_STYLES,
	PersonCardFooter,
	PersonCardHeader,
	PersonCardSkeleton,
	PortfolioLink,
	PreferencesCard,
	ProfessionalInfoCard,
	ProjectsRail,
} from "@/components/person-card/sections";
import styles from "@/components/person-card/style.module.scss";
import { useMyOpenPositions } from "@/hooks/useVacancyChat";

const { Paragraph, Text } = Typography;

type SpecialistData = Speciality & {
	availableProjects: (MatchingSpecialistAndProject & {
		project: { name: string };
	})[];
	direction: WorkDirection;
	user: {
		id: string;
		name: string | null;
		image: string | null;
		email: string | null;
		updatedAt: string;
		profile: Profile & { [key: string]: any };
	};
	projects: PersonCardProject[];
	certificates: PersonCardCertificate[];
	chat: { roomId: string } | null;
};

// Portfolio URLs are user-entered and often lack a protocol
// (e.g. "www.linkedin.com/..."), which Next's <Link> would treat as an
// in-app relative path. Normalize to an absolute external URL.
const matchColor = (percent: number, token: any) => {
	if (percent >= 80) return token.colorSuccess;
	if (percent >= 60) return token.colorWarning;
	return token.colorError;
};

// Keep the rail tidy for prolific members — active projects first, the rest
// behind a "show more" toggle.
const SpecialistPreviewModal = ({
	specialistId,
	open,
	onCancel,
	// Off where the card is opened to weigh somebody up for something else — the
	// curator picker is considering them for the 28 days, not for a seat on the
	// team, and a hiring CTA there is an offer nobody meant to make.
	withOffer = true,
}: any) => {
	const { t } = useTranslate();
	const session: any = useSession();
	const { setSelectedRoomId, setOpenChatModal } = useChat();
	const [offerOpen, setOfferOpen] = useState(false);
	const [showAllProjects, _setShowAllProjects] = useState(false);

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
		open && withOffer && !!session?.data,
	);

	const data = specialist;
	const isSelf = data?.user.id === session?.data?.user?.id;
	const acceptedRoomId = data?.chat?.roomId ?? null;
	const canOffer = withOffer && myPositions.length > 0 && !!data && !isSelf;
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
	const _DirIcon = direction?.icon;

	const _initials = toInitials(data?.user.name || data?.name);

	const timeForWork = data?.user.profile?.timeForWork;

	// Active memberships first, then the rest; collapse long lists.
	const sortedProjects = (data?.projects ?? [])
		.slice()
		.sort((a, b) => Number(b.active) - Number(a.active));
	const visibleProjects = showAllProjects
		? sortedProjects
		: sortedProjects.slice(0, PROJECTS_LIMIT);
	const _hiddenProjectsCount = sortedProjects.length - visibleProjects.length;

	const _renderPreference = (items?: { name: string }[], tone?: "pref") =>
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
			styles={PERSON_CARD_MODAL_STYLES}
			mask={{ closable: false }}
			open={open}
			onCancel={onCancel}
			footer={null}
		>
			{isLoading && !data ? (
				<PersonCardSkeleton />
			) : (
				!!data && (
					<div className={styles.card}>
						<PersonCardHeader
							eyebrow={t("specialist.preview.cardType", "Talent card")}
							image={data.user.image}
							name={data.user.name || data.name}
							level={data.level}
							role={data.name}
							directionName={data.direction?.name}
							location={[data.user.profile?.country, data.user.profile?.city]
								.filter(Boolean)
								.join(", ")}
							timeForWork={timeForWork}
							action={
								acceptedRoomId ? (
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
								)
							}
						/>

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

								<PortfolioLink url={data.portfolioUrl} />
								<ProjectsRail projects={data.projects} />
								<CertificatesRail certificates={data.certificates} />
							</div>

							{/* Right content */}
							<div className={styles.rightContent}>
								<AboutCard about={data.user.profile?.about} />
								<ProfessionalInfoCard info={data} />
								<PreferencesCard
									genres={data.user.profile?.preferredGenres}
									settings={data.user.profile?.preferredSettings}
									levels={data.user.profile?.preferredLevels}
								/>

								{data.availableProjects?.map((record) => (
									<MatchCard key={record.id} record={record} t={t} />
								))}
							</div>
						</div>

						<PersonCardFooter>
							{t("specialist.preview.lastUpdated", "Last updated")}{" "}
							{formatDate(data.user.updatedAt)}
						</PersonCardFooter>
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
