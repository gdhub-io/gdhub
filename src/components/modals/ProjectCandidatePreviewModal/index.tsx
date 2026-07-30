import type {
	GameDifficultyLevel,
	GameGenre,
	GameSetting,
	Profile,
	Project,
	Speciality,
	TeamMember,
	TeamVacancy,
	User,
} from "@gdhub-io/gdhub-prisma";
import { TbBrandTelegram } from "@react-icons/all-files/tb/TbBrandTelegram";
import { TbMail } from "@react-icons/all-files/tb/TbMail";
import { IconCopy } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Col,
	Descriptions,
	Form,
	Modal,
	message,
	Row,
	Space,
	Spin,
	Typography,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect } from "react";
import { gtmEventTrigger } from "@/helpers/gtm";
import {
	useGameDifficulties,
	useGameGenres,
	useGameSettings,
} from "@/hooks/library";
import { useOpenVacancyChat } from "@/hooks/useVacancyChat";
import styles from "./style.module.scss";

const { Text } = Typography;

const ProjectCandidatePreviewModal = ({
	candidateId,
	open,
	onOk,
	onCancel,
}: any) => {
	const queryClient = useQueryClient();
	const { t } = useTranslate();
	const [form] = Form.useForm();
	const { getGameGenreName } = useGameGenres();
	const { getGameSettingName } = useGameSettings();
	const { getGameDifficultyName } = useGameDifficulties();

	const {
		data: candidate,
		refetch: refetchCandidate,
		isFetching: processing,
	} = useQuery({
		queryKey: ["candidate", candidateId],
		queryFn: () =>
			axios.get<
				TeamMember & {
					vacancy: TeamVacancy;
					team: { project: Project };
					speciality: Speciality;
					user: User & {
						specialities: Speciality[];
						profile: Profile & {
							preferedGenres: GameGenre[];
							preferedSettings: GameSetting[];
							preferedDifficulties: GameDifficultyLevel[];
						};
					};
				}
			>("/api/user/project/candidate", {
				params: { id: candidateId },
			}),
		enabled: !!candidateId,
		refetchInterval: false,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: rejectCandidate, isPending: isRejecting } = useMutation({
		mutationFn: (data: { id: string }) =>
			axios.put<void>("/api/user/project/vacancy/candidate/reject", data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["user-project-team", candidate?.data.teamId],
			});

			gtmEventTrigger("job", {
				action: "reject",
				vacancyName: candidate?.data.vacancy.title,
				projectName: candidate?.data.team.project.name,
			});
		},
	});
	const { mutateAsync: hireCandidate, isPending: isHiring } = useMutation({
		mutationFn: (data: { id: string }) =>
			axios.put<void>("/api/user/project/vacancy/candidate/hire", data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["user-project-team", candidate?.data.teamId],
			});

			gtmEventTrigger("job", {
				action: "hire",
				vacancyName: candidate?.data.vacancy.title,
				projectName: candidate?.data.team.project.name,
			});
		},
	});

	const { openVacancyChat, isOpening: isOpeningChat } = useOpenVacancyChat();

	const handleOpenChat = async () => {
		if (!candidate?.data) return;
		try {
			const { roomId } = await openVacancyChat({
				vacancyId: candidate.data.vacancy.id,
				candidateUserId: candidate.data.user.id,
			});
			if (roomId) onCancel();
		} catch (error: any) {
			message.error(error?.response?.data?.message || error.message);
		}
	};

	useEffect(() => {
		if (open && candidateId) {
			refetchCandidate();
		}
	}, [open]);

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	const handleReject = async () => {
		try {
			await rejectCandidate({ id: candidateId });

			message.success(
				t("You rejected the candidacy ") + candidate?.data.user.name,
			);
			onOk();
		} catch (error: any) {
			message.error(error.message);
		}
	};

	const handleApprove = async () => {
		try {
			await hireCandidate({ id: candidateId });

			message.success(t(`You took the team`) + " " + candidate?.data.user.name);
			onOk();
		} catch (error: any) {
			message.error(error.message);
		}
	};

	return (
		<Modal
			centered
			title={t("projectCandidatePreviewModal.title", "Candidate card")}
			width={800}
			destroyOnHidden
			mask={{ closable: false }}
			open={open}
			onCancel={handleCancel}
			confirmLoading={processing}
			footer={[
				<Space key="form-buttons" wrap>
					<Button key="close" onClick={handleCancel} disabled={processing}>
						{t("projectCandidatePreviewModal.close", "Close")}
					</Button>
					<Button
						key="message"
						disabled={processing}
						loading={isOpeningChat}
						onClick={handleOpenChat}
					>
						{t("projectCandidatePreviewModal.message", "Message")}
					</Button>
					<Button key="reject" disabled={processing} onClick={handleReject}>
						{t("projectCandidatePreviewModal.reject", "Reject")}
					</Button>
					<Button
						key="approve"
						disabled={processing}
						type="primary"
						onClick={handleApprove}
					>
						{t("projectCandidatePreviewModal.acceptTheTeam", "Accept the team")}
					</Button>
				</Space>,
			]}
		>
			<Spin spinning={processing}>
				{!!candidate && (
					<>
						<Row gutter={[24, 24]}>
							<Col xs={{ span: 24, order: 1 }} md={{ span: 18, order: 0 }}>
								<div className={styles.specialityTitle}>
									<h1>{candidate?.data.user.name}</h1>
									{candidate?.data.speciality.name} (
									{candidate?.data.speciality.level})
								</div>

								<Descriptions
									layout="horizontal"
									column={1}
									size="small"
									labelStyle={{ fontWeight: "bold" }}
								>
									<Descriptions.Item label={t("Interested in the vacancy")}>
										{candidate.data.vacancy.title}
									</Descriptions.Item>
									<Descriptions.Item label={t("On the project")}>
										{candidate.data.team.project.name}
									</Descriptions.Item>
									<Descriptions.Item label={t("Created")}>
										{dayjs(candidate.data.createdAt).format("LLL")}
									</Descriptions.Item>
									{!!candidate.data.applicationMessage && (
										<Descriptions.Item
											label={t(
												"projectCandidatePreviewModal.greeting",
												"Message from the candidate",
											)}
										>
											{candidate.data.applicationMessage}
										</Descriptions.Item>
									)}
								</Descriptions>

								<Descriptions
									title={t("About the participant")}
									className={styles.descriptionBlock}
									layout="horizontal"
									column={1}
									size="small"
									labelStyle={{ fontWeight: "bold" }}
								>
									{!!candidate?.data.speciality.portfolioUrl && (
										<Descriptions.Item
											label={t(
												"projectCandidatePreviewModal.cvPortfolio",
												"CV/Portfolio",
											)}
										>
											<Link
												href={candidate?.data.speciality.portfolioUrl}
												target="_blank"
											>
												<Button size="small">
													{t("projectCandidatePreviewModal.go", "Go")}
												</Button>
											</Link>
										</Descriptions.Item>
									)}
									<Descriptions.Item
										label={t(
											"projectCandidatePreviewModal.freeTime",
											"Free time",
										)}
									>
										{t(
											"projectCandidatePreviewModal.fromTo",
											"from {fromDate} to {toDate} hours a week",
											{
												fromDate: candidate.data.user.profile.timeForWork[0],
												toDate: candidate.data.user.profile.timeForWork[1],
											},
										)}
									</Descriptions.Item>
									<Descriptions.Item
										label={t(
											"projectCandidatePreviewModal.placeOfResidence",
											"Place of residence",
										)}
									>
										{[
											candidate.data.user.profile.country,
											candidate.data.user.profile.city,
										].join(", ")}
									</Descriptions.Item>
									<Descriptions.Item
										label={t(
											"projectCandidatePreviewModal.motivation",
											"Motivation",
										)}
									>
										{candidate.data.user.profile.motivation}
									</Descriptions.Item>
								</Descriptions>
							</Col>
							<Col xs={{ span: 24, order: 0 }} md={{ span: 6, order: 1 }}>
								<Space
									orientation="vertical"
									align="center"
									style={{ width: "100%" }}
								>
									{!!candidate.data.user.image && (
										<div className={styles.avatar}>
											<Image
												src={candidate.data.user.image}
												alt="project member avatar"
												width={160}
												height={160}
											/>
										</div>
									)}
									{!!candidate.data?.allowedContacts.includes("email") &&
										!!candidate.data.user.email && (
											<Space orientation="vertical" size={0}>
												<Text type="secondary">
													{t("projectCandidatePreviewModal.email", "Email")}
												</Text>
												<Text
													copyable={{
														icon: <IconCopy size={16} />,
														text: candidate.data.user.email,
													}}
												>
													{candidate.data.user.email}
												</Text>
											</Space>
										)}

									{!!candidate.data?.allowedContacts.includes("telegram") &&
										!!candidate.data?.user.profile.tgNickname && (
											<Space orientation="vertical" align="start" size={0}>
												<Text type="secondary">
													{t(
														"projectCandidatePreviewModal.telegram",
														"Telegram",
													)}
												</Text>

												<Text
													copyable={{
														icon: (
															<IconCopy
																size={16}
																style={{ position: "relative", top: 2 }}
															/>
														),
														text:
															"https://t.me/" +
															candidate.data?.user.profile.tgNickname,
													}}
												>
													{`t.me/${candidate.data?.user.profile.tgNickname}`}
												</Text>
											</Space>
										)}
								</Space>
							</Col>
						</Row>

						<Descriptions
							title={t("About specialty")}
							className={styles.descriptionBlock}
							layout="vertical"
							column={1}
							size="small"
							labelStyle={{ fontWeight: "bold" }}
						>
							<Descriptions.Item label={t("Specialization")}>
								{candidate.data.speciality.specialization}
							</Descriptions.Item>
							<Descriptions.Item label={t("Skills")}>
								{candidate.data.speciality.skills}
							</Descriptions.Item>
							<Descriptions.Item label={t("I use it in work")}>
								{candidate.data.speciality.tools ||
									t("(tools are not indicated)")}
							</Descriptions.Item>
							<Descriptions.Item label={t("Experience")}>
								{candidate.data.speciality.jobs ||
									t("(places of work are not indicated)")}
							</Descriptions.Item>
							<Descriptions.Item label={t("Where I received knowledge")}>
								{candidate.data.speciality.schools ||
									t("(places of training are not indicated)")}
							</Descriptions.Item>
						</Descriptions>

						<Descriptions
							title={t("Preferences in games")}
							layout="vertical"
							column={1}
							size="small"
							labelStyle={{ fontWeight: "bold" }}
							className={styles.descriptionBlock}
						>
							<Descriptions.Item label={t("I prefer genres")}>
								{candidate.data.user.profile.preferedGenres
									? candidate.data.user.profile.preferedGenres
											.map((r) => getGameGenreName(r.id))
											.join(", ")
									: t(
											"projectCandidatePreviewModal.notPointed",
											"(not pointed)",
										)}
							</Descriptions.Item>
							<Descriptions.Item label={t("I prefer game settings")}>
								{candidate.data.user.profile.preferedSettings
									? candidate.data.user.profile.preferedSettings
											.map((r) => getGameSettingName(r.id))
											.join(", ")
									: t(
											"projectCandidatePreviewModal.notPointed",
											"(not pointed)",
										)}
							</Descriptions.Item>
							<Descriptions.Item
								label={t("I prefer games of the following complexity")}
							>
								{candidate.data.user.profile.preferedDifficulties
									? candidate.data.user.profile.preferedDifficulties
											.map((r) => getGameDifficultyName(r.id))
											.join(", ")
									: t(
											"projectCandidatePreviewModal.notPointed",
											"(not pointed)",
										)}
							</Descriptions.Item>
						</Descriptions>
					</>
				)}
			</Spin>
		</Modal>
	);
};

export default ProjectCandidatePreviewModal;
