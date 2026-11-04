import {
	IconBriefcase,
	IconCalendar,
	IconMessageCircle,
	IconShieldCheck,
	IconUserCheck,
	IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Modal, message, Typography } from "antd";
import axios from "axios";
import {
	formatDate,
	type PersonCardCertificate,
	type PersonCardProject,
} from "@/components/person-card";
import {
	AboutCard,
	CertificatesRail,
	ContactField,
	ContentCard,
	PERSON_CARD_MODAL_STYLES,
	PersonCardFooter,
	PersonCardHeader,
	PersonCardSkeleton,
	PortfolioLink,
	PreferencesCard,
	ProfessionalInfoCard,
	ProjectsRail,
	RailLabel,
} from "@/components/person-card/sections";
import styles from "@/components/person-card/style.module.scss";
import { gtmEventTrigger } from "@/helpers/gtm";
import { useOpenVacancyChat } from "@/hooks/useVacancyChat";
import type { CandidateCard } from "@/repositories/vacancy/candidate-card";

const { Paragraph, Text } = Typography;

/** The card as it arrives over JSON: dates are strings. */
type Card = Omit<
	CandidateCard,
	"createdAt" | "candidate" | "projects" | "certificates"
> & {
	createdAt: string;
	candidate: Omit<CandidateCard["candidate"], "updatedAt"> & {
		updatedAt: string;
	};
	projects: PersonCardProject[];
	certificates: PersonCardCertificate[];
};

/**
 * An application as the project reviewing it reads it (frame 04.07). Its own
 * modal on its own endpoint, sharing only the talent card's parts — so nothing
 * the talent card keeps behind an accepted offer can reach a candidate's card.
 */
const ProjectCandidatePreviewModal = ({
	candidateId,
	open,
	onOk,
	onCancel,
}: {
	candidateId?: string;
	open: boolean;
	onOk: () => void;
	onCancel: () => void;
}) => {
	const queryClient = useQueryClient();
	const { t } = useTranslate();

	const { data, isLoading } = useQuery({
		queryKey: ["candidate", candidateId],
		queryFn: () =>
			axios
				.get<Card>("/api/user/project/candidate", {
					params: { id: candidateId },
				})
				.then((response) => response.data),
		enabled: open && !!candidateId,
		refetchOnWindowFocus: false,
	});

	const decide = (action: "hire" | "reject") => ({
		mutationFn: () =>
			axios.put<void>(`/api/user/project/vacancy/candidate/${action}`, {
				id: candidateId,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["user-project-team", data?.vacancy.teamId],
			});
			gtmEventTrigger("job", {
				action,
				vacancyName: data?.vacancy.title,
				projectName: data?.vacancy.projectName,
			});
		},
	});
	const reject = useMutation(decide("reject"));
	const hire = useMutation(decide("hire"));
	const { openVacancyChat, isOpening: isOpeningChat } = useOpenVacancyChat();
	const busy = reject.isPending || hire.isPending;

	const run = async (mutation: typeof hire, done: string) => {
		try {
			await mutation.mutateAsync();
			message.success(done);
			onOk();
		} catch (error: unknown) {
			const failure = error as {
				message: string;
				response?: { data?: { message?: string } };
			};
			message.error(failure.response?.data?.message || failure.message);
		}
	};

	const openChat = async () => {
		if (!data) return;
		try {
			const { roomId } = await openVacancyChat({
				vacancyId: data.vacancy.id,
				candidateUserId: data.candidate.id,
			});
			if (roomId) onCancel();
		} catch (error: unknown) {
			const failure = error as {
				message: string;
				response?: { data?: { message?: string } };
			};
			message.error(failure.response?.data?.message || failure.message);
		}
	};

	const name = data?.candidate.name ?? "";

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
			{isLoading || !data ? (
				<PersonCardSkeleton />
			) : (
				<div className={styles.card}>
					<PersonCardHeader
						eyebrow={t("projectCandidatePreviewModal.title", "Candidate card")}
						image={data.candidate.image}
						name={name}
						level={data.speciality.level}
						role={data.speciality.name}
						directionName={data.speciality.direction?.name}
						location={data.candidate.location}
						timeForWork={data.candidate.timeForWork}
						action={
							<div className={styles.candidateActions}>
								<Button
									icon={<IconMessageCircle size={15} />}
									loading={isOpeningChat}
									disabled={busy}
									onClick={openChat}
								>
									{t("projectCandidatePreviewModal.message", "Message")}
								</Button>
								<Button
									danger
									icon={<IconX size={15} />}
									loading={reject.isPending}
									disabled={busy}
									onClick={() =>
										run(
											reject,
											t(
												"projectCandidatePreviewModal.rejected",
												"You rejected {name}",
												{ name },
											),
										)
									}
								>
									{t("projectCandidatePreviewModal.reject", "Reject")}
								</Button>
								<Button
									type="primary"
									icon={<IconUserCheck size={15} />}
									loading={hire.isPending}
									disabled={busy}
									onClick={() =>
										run(
											hire,
											t(
												"projectCandidatePreviewModal.hired",
												"{name} joined the team",
												{ name },
											),
										)
									}
								>
									{t(
										"projectCandidatePreviewModal.acceptTheTeam",
										"Accept the team",
									)}
								</Button>
							</div>
						}
					/>

					<div className={styles.body}>
						<div className={styles.leftRail}>
							<RailLabel>
								{t("specialist.preview.contacts", "Contacts")}
							</RailLabel>
							{data.candidate.email && (
								<ContactField
									label={t("specialist.preview.email", "Email")}
									value={data.candidate.email}
								/>
							)}
							{data.candidate.telegram && (
								<ContactField
									label={t("projectCandidatePreviewModal.telegram", "Telegram")}
									value={`t.me/${data.candidate.telegram}`}
									href={`https://t.me/${data.candidate.telegram}`}
								/>
							)}
							{!data.candidate.email && !data.candidate.telegram && (
								<Text type="secondary">
									{t(
										"projectCandidatePreviewModal.noContacts",
										"No contacts shared — write in the chat.",
									)}
								</Text>
							)}
							<PortfolioLink url={data.speciality.portfolioUrl} />
							<ProjectsRail projects={data.projects} />
							<CertificatesRail certificates={data.certificates} />
						</div>

						<div className={styles.rightContent}>
							<ContentCard
								title={t(
									"projectCandidatePreviewModal.application",
									"Application",
								)}
							>
								<Flex gap={16} wrap className={styles.applicationMeta}>
									<span>
										<IconBriefcase size={14} />
										{t(
											"projectCandidatePreviewModal.appliedTo",
											"Applied to {position}",
											{ position: data.vacancy.title },
										)}
									</span>
									<span>
										<IconCalendar size={14} />
										{formatDate(data.createdAt)}
									</span>
									{data.allowedContacts.length > 0 && (
										<span>
											<IconShieldCheck size={14} />
											{t(
												"projectCandidatePreviewModal.contactsAllowed",
												"Contacts allowed: {list}",
												{ list: data.allowedContacts.join(", ") },
											)}
										</span>
									)}
								</Flex>
								{data.message ? (
									<Paragraph className={`${styles.para} ${styles.quote}`}>
										“{data.message}”
									</Paragraph>
								) : (
									<Text type="secondary">
										{t("projectCandidatePreviewModal.noMessage", "No message.")}
									</Text>
								)}
							</ContentCard>
							<AboutCard about={data.candidate.about} />
							<ProfessionalInfoCard info={data.speciality} />
							<PreferencesCard
								genres={data.candidate.preferredGenres}
								settings={data.candidate.preferredSettings}
								levels={data.candidate.preferredLevels}
							/>
						</div>
					</div>

					<PersonCardFooter>
						{t("projectCandidatePreviewModal.appliedOn", "Applied {date}", {
							date: formatDate(data.createdAt),
						})}{" "}
						· {t("specialist.preview.lastUpdated", "Last updated")}{" "}
						{formatDate(data.candidate.updatedAt)}
					</PersonCardFooter>
				</div>
			)}
		</Modal>
	);
};

export default ProjectCandidatePreviewModal;
