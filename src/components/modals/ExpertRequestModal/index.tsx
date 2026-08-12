import type { AdviceRequest } from "@gdhub-io/gdhub-prisma";
import {
	IconBriefcase,
	IconClock,
	IconExternalLink,
	IconMapPin,
	IconSend,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Alert, Form, Input, Modal, message, Select, Spin } from "antd";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { getWorkDirection } from "@/components/DirectionBadge";
import {
	CertificateMiniCard,
	darkenTint,
	type PersonCardCertificate,
	type PersonCardProject,
	ProjectMiniCard,
	SkillTags,
	toExternalUrl,
	toInitials,
} from "@/components/person-card";
import cardStyles from "@/components/person-card/style.module.scss";
import { AdviceRequestStatus } from "@/config/prisma-enums";
import styles from "./style.module.scss";

interface ExpertRequestModalProps {
	open: boolean;
	onCancel: () => void;
	expertId?: string;
	adviceRequestId?: string;
	onUpdate?: () => void;
}

type UserProject = { id: string; name: string };

type ExpertSpeciality = {
	id: string;
	name: string;
	level: string;
	summary: string | null;
	specialization: string;
	portfolioUrl: string | null;
	jobs: string | null;
	tools: string | null;
	schools: string | null;
	skills: string | null;
	timeForMentoring: string | null;
	openForQuestions: string[];
	direction: { id: string; name: string } | null;
};

type ExpertData = {
	id: string;
	name: string | null;
	image: string | null;
	profile: { name: string | null; country: string | null; city: string | null };
	specialities: ExpertSpeciality[];
	projects: PersonCardProject[];
	certificates: PersonCardCertificate[];
	helpedProjectsCount: number;
};

/**
 * Advising is only social proof once it is a habit rather than a favour, so the
 * count stays off the card until three projects are behind it. One or two says
 * more about how new someone is than about how much they help.
 */
const STATS_MIN = 3;

/** One labelled block of the rail, ruled off from the one above it. */
function RailSection({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<section className={styles.railSection}>
			<div className={cardStyles.railLabel}>{label}</div>
			{children}
		</section>
	);
}

/**
 * The role and what it is a role in.
 *
 * The two sit on one line separated by a dot; when the specialization is too
 * long to fit beside the role it drops to its own line, and the dot goes with
 * it — a separator at the start of a line separates nothing. Whether it fits is
 * a question about rendered text, so it is measured rather than guessed.
 */
function RoleRow({
	icon,
	role,
	specialization,
}: {
	icon: ReactNode;
	role?: string;
	specialization?: string | null;
}) {
	const roleRef = useRef<HTMLSpanElement>(null);
	const specRef = useRef<HTMLSpanElement>(null);
	const [wrapped, setWrapped] = useState(false);

	useLayoutEffect(() => {
		const roleEl = roleRef.current;
		const specEl = specRef.current;
		if (!roleEl || !specEl) return;

		const measure = () =>
			setWrapped(specEl.offsetTop > roleEl.offsetTop + roleEl.offsetHeight / 2);

		measure();

		const observer = new ResizeObserver(measure);
		observer.observe(roleEl.parentElement ?? roleEl);

		return () => observer.disconnect();
	}, []);

	return (
		<div className={`${cardStyles.roleRow} ${styles.roleRow}`}>
			{icon}
			<span ref={roleRef} className={cardStyles.role}>
				{role}
			</span>
			{!!specialization && (
				<span ref={specRef} className={cardStyles.roleMuted}>
					{wrapped ? "" : "· "}
					{specialization}
				</span>
			)}
		</div>
	);
}

/**
 * The expert card: who this person is, and the request you came to send them.
 *
 * The same card as the talent card — header, rail and the compact popovers all
 * come from `@/components/person-card` — with the offer replaced by the advice
 * request. The professional block sits at the foot of the rail, where the
 * column had room to spare, leaving the right side to the one thing this card
 * is for. Opening it on an existing request turns the form into a read-only
 * record of what was asked, with the option to withdraw it.
 */
export default function ExpertRequestModal({
	adviceRequestId,
	open,
	onCancel,
	expertId,
	onUpdate,
}: ExpertRequestModalProps) {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const { data: session } = useSession();

	const {
		data: adviceRequest,
		isLoading: adviceRequestLoading,
		refetch: refetchAdviceRequest,
	} = useQuery({
		queryKey: ["adviceRequest", adviceRequestId],
		queryFn: () =>
			axios
				.get<AdviceRequest>(`/api/user/advice-request/${adviceRequestId}`)
				.then((res) => res.data),
		enabled: !!adviceRequestId && open,
	});

	const targetExpertId = expertId || adviceRequest?.toUserId;

	const { data: expert, isLoading: expertLoading } = useQuery<ExpertData>({
		queryKey: ["expert", targetExpertId],
		queryFn: () =>
			axios.get(`/api/expert/${targetExpertId}`).then((res) => res.data),
		enabled: !!targetExpertId && open,
		staleTime: 1000 * 60 * 5,
	});

	const { data: userProjects, isLoading: userProjectsLoading } = useQuery({
		queryKey: ["userProjects", session?.user.id],
		queryFn: () =>
			axios.get<UserProject[]>("/api/user/projects").then((res) => res.data),
		enabled: !!session?.user.id && open,
	});

	const {
		mutateAsync: createExpertRequest,
		isPending: isCreatingExpertRequest,
	} = useMutation({
		mutationFn: (data: Partial<AdviceRequest>) =>
			axios.post<AdviceRequest>("/api/user/advice-request", data),
	});

	const {
		mutateAsync: cancelExpertRequest,
		isPending: isCancellingExpertRequest,
	} = useMutation({
		mutationFn: ({ id }: { id: string }) =>
			axios.put<AdviceRequest>(`/api/user/advice-request/${id}/cancel`),
	});

	useEffect(() => {
		if (!adviceRequest) return;

		form.setFieldsValue({
			topic: adviceRequest.topic,
			projectId: adviceRequest.projectId,
			comment: adviceRequest.comment,
		});
	}, [adviceRequest, form]);

	const speciality = expert?.specialities?.[0];
	const direction = speciality?.direction?.name
		? getWorkDirection(speciality.direction.name)
		: null;
	const DirIcon = direction?.icon;

	const location = [expert?.profile?.country, expert?.profile?.city]
		.filter(Boolean)
		.join(", ");

	const helpedProjects = expert?.helpedProjectsCount ?? 0;

	const topicOptions =
		speciality?.openForQuestions.map((question) => ({
			label: question,
			value: question,
		})) ?? [];
	const projectOptions =
		userProjects?.map((project) => ({
			label: project.name,
			value: project.id,
		})) ?? [];

	const isExistingRequest = !!adviceRequestId;
	const canWithdraw =
		isExistingRequest && adviceRequest?.status === AdviceRequestStatus.Created;
	const isBusy = isCreatingExpertRequest || isCancellingExpertRequest;

	const handleSend = async () => {
		const formData = await form.validateFields();

		await createExpertRequest({
			topic: formData.topic,
			projectId: formData.projectId,
			toUserId: targetExpertId,
			comment: formData.comment,
		});

		form.resetFields();
		onUpdate?.();

		message.success(t("modal.expert.requestSent", "Your request is sent"));
	};

	const handleWithdraw = useCallback(async () => {
		if (!adviceRequestId) return;

		await cancelExpertRequest({ id: adviceRequestId });
		await refetchAdviceRequest();

		onUpdate?.();
	}, [adviceRequestId, cancelExpertRequest, refetchAdviceRequest, onUpdate]);

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
			<Spin spinning={expertLoading || adviceRequestLoading || isBusy}>
				{!!expert && (
					<div className={cardStyles.card}>
						{/* ---------- Header ---------- */}
						<div
							className={cardStyles.header}
							style={{
								background:
									direction?.color || "var(--gd-color-surface-sunken)",
							}}
						>
							<div
								className={cardStyles.eyebrow}
								style={
									direction ? { color: darkenTint(direction.color) } : undefined
								}
							>
								{t("expert.card.cardType", "Expert card")}
							</div>

							<div className={cardStyles.identity}>
								<div className={cardStyles.avatar}>
									{expert.image ? (
										// biome-ignore lint/performance/noImgElement: external avatar url
										<img
											src={expert.image}
											alt={expert.name || ""}
											className={cardStyles.avatarImg}
										/>
									) : (
										<span>{toInitials(expert.name)}</span>
									)}
								</div>

								<div className={cardStyles.identityText}>
									<div className={cardStyles.nameRow}>
										<span className={cardStyles.name}>
											{expert.profile?.name || expert.name}
										</span>
										{!!speciality?.level && (
											<span className={cardStyles.levelBadge}>
												{speciality.level}
											</span>
										)}
									</div>
									<RoleRow
										icon={
											DirIcon ? (
												<span className={cardStyles.dirChip}>
													<DirIcon
														size={14}
														stroke={2}
														color={direction?.ink}
													/>
												</span>
											) : null
										}
										role={speciality?.name}
										specialization={speciality?.specialization}
									/>
								</div>
							</div>

							<div className={cardStyles.metaRow}>
								<div className={cardStyles.metaLeft}>
									{!!location && (
										<span className={cardStyles.pill}>
											<IconMapPin size={14} className={cardStyles.pillIcon} />
											{location}
										</span>
									)}
									{/* A track record, not a counter: below the threshold these
									    say more about how new someone is than about how much
									    they help. */}
									{helpedProjects >= STATS_MIN && (
										<span className={cardStyles.pill}>
											<IconBriefcase
												size={14}
												className={cardStyles.pillIcon}
											/>
											{t(
												"expert.card.helpedProjects",
												"{count, plural, one {Helped # project} other {Helped # projects}}",
												{ count: helpedProjects },
											)}
										</span>
									)}
								</div>
							</div>
						</div>

						{/* ---------- Body ---------- */}
						<div className={`${cardStyles.body} ${styles.body}`}>
							<div className={`${cardStyles.leftRail} ${styles.rail}`}>
								{/* Absolutely positioned, so the rail takes its height from
								    the form beside it and scrolls when it has more to say
								    than the form has room for. */}
								<div className={styles.railScroll}>
									{!!speciality?.portfolioUrl && (
										<RailSection label={t("specialist.preview.links", "Links")}>
											<Link
												href={toExternalUrl(speciality.portfolioUrl)}
												target="_blank"
												rel="noopener noreferrer"
												className={cardStyles.portfolioBtn}
											>
												<IconExternalLink size={15} />
												{t(
													"specialist.preview.summaryPortfolio",
													"Summary / Portfolio",
												)}
											</Link>
										</RailSection>
									)}

									{/* The professional block is not one section but four, each
									    labelled like the ones above it. Specialization is not
									    among them — it stands beside the role in the header. */}
									{!!speciality?.jobs && (
										<RailSection
											label={t("specialist.preview.experience", "Experience")}
										>
											<span className={cardStyles.fieldValue}>
												{speciality.jobs}
											</span>
										</RailSection>
									)}
									{!!speciality?.tools && (
										<RailSection
											label={t(
												"specialist.preview.iUseItInWork",
												"I use in work",
											)}
										>
											<span className={cardStyles.fieldValue}>
												{speciality.tools}
											</span>
										</RailSection>
									)}
									{!!speciality?.schools && (
										<RailSection
											label={t(
												"specialist.preview.whereIReceivedKnowledge",
												"Education",
											)}
										>
											<span className={cardStyles.fieldValue}>
												{speciality.schools}
											</span>
										</RailSection>
									)}
									{!!speciality?.skills && (
										<RailSection
											label={t("specialist.preview.skills", "Skills")}
										>
											<div className={cardStyles.tagRow}>
												<SkillTags value={speciality.skills} />
											</div>
										</RailSection>
									)}

									{expert.projects.length > 0 && (
										<RailSection
											label={t("specialist.preview.projects", "Projects")}
										>
											{expert.projects.map((project) => (
												<ProjectMiniCard
													key={project.id}
													project={project}
													t={t}
												/>
											))}
										</RailSection>
									)}

									{expert.certificates.length > 0 && (
										<RailSection
											label={t(
												"specialist.preview.certificates",
												"Certificates",
											)}
										>
											{expert.certificates.map((certificate) => (
												<CertificateMiniCard
													key={certificate.number}
													cert={certificate}
													t={t}
												/>
											))}
										</RailSection>
									)}
								</div>
							</div>

							<div className={cardStyles.rightContent}>
								{/* ---------- Ask for advice ---------- */}
								<div className={styles.ask}>
									<div className={cardStyles.cardTitle}>
										{t("expert.card.askForAdvice", "Ask for advice")}
									</div>
									<div className={styles.askIntro}>
										{t(
											"expert.card.askIntro",
											"Pick what you want to talk about and which project it concerns.",
										)}
									</div>

									{userProjects?.length || isExistingRequest ? (
										<>
											<Form
												form={form}
												layout="vertical"
												variant="filled"
												name="expert-request-form"
												requiredMark
												disabled={isExistingRequest}
												className={styles.askForm}
											>
												<Form.Item
													name="topic"
													label={t("expert.card.topic", "Topic")}
													rules={[{ required: true }]}
												>
													<Select
														options={topicOptions}
														placeholder={t(
															"expert.card.selectTopic",
															"Select a topic",
														)}
													/>
												</Form.Item>
												<Form.Item
													name="projectId"
													label={t("expert.card.yourProject", "Your project")}
													rules={[{ required: true }]}
												>
													<Select
														options={projectOptions}
														loading={userProjectsLoading}
														placeholder={t(
															"expert.card.selectProject",
															"Select your project",
														)}
													/>
												</Form.Item>
												<Form.Item
													name="comment"
													label={t("expert.card.comment", "Comment")}
													rules={[{ required: true }]}
												>
													<Input.TextArea
														rows={4}
														placeholder={t(
															"expert.card.commentPlaceholder",
															"What you want advice on, and what you have tried",
														)}
													/>
												</Form.Item>
											</Form>

											{!!speciality?.timeForMentoring && (
												<div className={styles.responseNote}>
													<IconClock size={15} />
													{speciality.timeForMentoring}
												</div>
											)}

											<div className={styles.askActions}>
												{canWithdraw ? (
													<button
														type="button"
														className={`${styles.sendBtn} ${styles.withdrawBtn}`}
														onClick={handleWithdraw}
														disabled={isBusy}
													>
														{t(
															"modal.expert.cancelRequest",
															"Withdraw request",
														)}
													</button>
												) : (
													!isExistingRequest && (
														<button
															type="button"
															className={styles.sendBtn}
															onClick={handleSend}
															disabled={isBusy}
														>
															<IconSend size={15} />
															{t("modal.expert.sendRequest", "Send request")}
														</button>
													)
												)}
											</div>
										</>
									) : (
										<Alert
											type="info"
											showIcon
											message={t(
												"expert.card.needProject",
												"You need at least one project to ask for advice",
											)}
										/>
									)}
								</div>
							</div>
						</div>
					</div>
				)}
			</Spin>
		</Modal>
	);
}
