import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { Markdown } from "@react-email/components";
import { useMutation, useQuery } from "@tanstack/react-query";
import { T, useTranslate } from "@tolgee/react";
import {
	Alert,
	Button,
	Col,
	Form,
	Modal,
	message,
	Row,
	Space,
	Spin,
	Typography,
	theme,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getVideoPoster, toPlayableVideoUrl } from "@/helpers/video";
import SpecialitySelectModal from "../SpecialitySelectModal";
import styles from "./style.module.scss";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const { Text, Title, Paragraph } = Typography;

const VacancyPreviewModal = ({ vacancyId, open, onOk, onCancel }: any) => {
	const { token } = theme.useToken();
	const session: any = useSession();
	const { t } = useTranslate();
	const router = useRouter();
	const pathname = usePathname();
	const [form] = Form.useForm();
	const [showSpecialitySelectModal, setShowSpecialitySelectModal] =
		useState(false);
	const [showPitchVideo, setShowPitchVideo] = useState(false);
	// Controlled play state kept in sync with the player, so the browser
	// pausing the video (e.g. on tab switch) isn't overridden back to playing.
	const [playingPitch, setPlayingPitch] = useState(false);

	const {
		data: vacancy,
		refetch: refetchVacancy,
		isFetching: processing,
	} = useQuery({
		queryKey: ["vacancy", vacancyId],
		queryFn: () =>
			axios.get<
				prismaClient.TeamVacancy & {
					promiseStep: prismaClient.ProjectWorkflowStep;
					team: {
						project: {
							id: string;
							slug: string;
							name: string;
							description: string;
							coverImage: string;
							videoLink: string;
							workflow: prismaClient.ProjectWorkflow & {
								steps: prismaClient.ProjectWorkflowStep[];
							};
						};
					};
					myTeamMemberId: string;
				}
			>("/api/project/vacancy", {
				params: { id: vacancyId },
			}),
		enabled: !!vacancyId,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: withdrawApply } = useMutation({
		mutationFn: (data: { teamMemberId: string }) =>
			axios.put<void>("/api/user/project/vacancy/withdraw", data),
	});

	const { mutateAsync: vacancyApply } = useMutation({
		mutationFn: (data: {
			specialityId: string;
			contactType: string[];
			telegramNickname?: string;
			applicationMessage?: string;
			vacancyId: string;
		}) => axios.post<void>("/api/user/project/vacancy/apply", data),
	});

	useEffect(() => {
		if (open && vacancyId && session?.data) {
			refetchVacancy();
		}
	}, [open]);

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	const handleSpecialitySelect = async ({
		specialityId,
		contactType,
		telegramNickname,
		applicationMessage,
	}: {
		specialityId: any;
		contactType: string[];
		telegramNickname?: string;
		applicationMessage?: string;
	}) => {
		if (!vacancy) return;

		try {
			await vacancyApply({
				specialityId,
				contactType,
				telegramNickname,
				applicationMessage,
				vacancyId: vacancy.data.id,
			});

			message.success(t("modal.vacancy.applySuccess", "Your response is sent"));
			setShowSpecialitySelectModal(false);
			setTimeout(onCancel, 600);
		} catch (error: any) {
			console.error(error);
			message.error(error.response?.data.message || error.message);
		}
	};

	const withdrawApplyHandler = async (data: { teamMemberId: string }) => {
		try {
			await withdrawApply(data);

			message.success(
				t("modal.vacancy.withdrawSuccess", "Your response is withdrawn"),
			);
			onCancel();
		} catch (error: any) {
			console.error(error);
			message.error(error.response?.data.message || error.message);
		}
	};

	const statusOkButton = () => {
		if (!session?.data) {
			return t("signin", "Signin");
		}

		return vacancy?.data.myTeamMemberId
			? t("modal.vacancy.cancelMyResponse", "Cancel my response")
			: t("modal.vacancy.apply", "Respond");
	};

	const functionOkButton = async () => {
		if (!session?.data) {
			router.push("/signin?callbackUrl=" + pathname);
		}

		return vacancy?.data.myTeamMemberId
			? withdrawApplyHandler({ teamMemberId: vacancy.data.myTeamMemberId })
			: setShowSpecialitySelectModal(true);
	};

	const handleCoverClick = () => {
		setShowPitchVideo(true);
		setPlayingPitch(true);
	};

	return (
		<>
			<Modal
				centered
				title={null}
				width={800}
				destroyOnHidden
				mask={{ closable: false }}
				open={open}
				onCancel={handleCancel}
				footer={[
					<Space key="form-buttons" wrap>
						<Button key="close" onClick={handleCancel} disabled={processing}>
							{t("modal.vacancy.close", "Close")}
						</Button>
						{session?.data && (
							<Button
								key="action"
								type="primary"
								onClick={functionOkButton}
								loading={processing}
							>
								{statusOkButton()}
							</Button>
						)}
					</Space>,
				]}
			>
				<Spin spinning={processing}>
					{!!vacancy && (
						<Space orientation="vertical" style={{ width: "100%" }}>
							<div className={styles.cardHeader}>
								<Text type="secondary" className={styles.cardType}>
									{t("modal.vacancy.vacancyCard", "Position card")}
								</Text>
								<div className={styles.vacancyTitle}>
									<Title level={2} style={{ margin: 0 }}>
										{vacancy.data.title}
									</Title>
								</div>
							</div>

							{/* Project Information Card */}

							<Row gutter={[24, 24]}>
								<Col xs={24} md={14}>
									<Space orientation="vertical" style={{ width: "100%" }}>
										<div>
											<Text type="secondary" className={styles.fieldLabel}>
												{t("modal.section.project", "Project")}
											</Text>
											<Title level={4} style={{ margin: "8px 0" }}>
												{vacancy.data.team.project.name}
											</Title>
										</div>

										{!!vacancy.data.team.project.description && (
											<div>
												<Text type="secondary" className={styles.fieldLabel}>
													{t(
														"modal.section.projectDescription",
														"Project description",
													)}
												</Text>
												<Markdown>
													{vacancy.data.team.project.description.length > 512
														? `${vacancy.data.team.project.description.slice(0, 512)}...(more on the project page)`
														: vacancy.data.team.project.description}
												</Markdown>
											</div>
										)}
									</Space>
								</Col>

								<Col xs={24} md={10}>
									{!showPitchVideo && vacancy.data.team.project.coverImage && (
										<div className={styles.projectCover}>
											{vacancy.data.team.project.videoLink && (
												<div className={styles.coverButtonContainer}>
													<Button
														onClick={handleCoverClick}
														type="primary"
														size="small"
													>
														{t("modal.section.watch", "Watch")}
													</Button>
												</div>
											)}
											<Image
												src={vacancy.data.team.project.coverImage}
												alt="Project cover"
												fill
												style={{ objectFit: "cover" }}
											/>
										</div>
									)}
									{vacancy.data.team.project.videoLink &&
										(showPitchVideo ||
											!vacancy.data.team.project.coverImage) && (
											<div className={styles.videoContainer}>
												<ReactPlayer
													src={toPlayableVideoUrl(
														vacancy.data.team.project.videoLink,
													)}
													light={
														showPitchVideo
															? false
															: getVideoPoster(
																	vacancy.data.team.project.videoLink,
																) || true
													}
													playing={playingPitch}
													onClickPreview={() => {
														setShowPitchVideo(true);
														setPlayingPitch(true);
													}}
													onPlay={() => setPlayingPitch(true)}
													onPause={() => setPlayingPitch(false)}
													controls
													width="100%"
													height="100%"
													onEnded={() => {
														setPlayingPitch(false);
														setShowPitchVideo(false);
													}}
												/>
											</div>
										)}
								</Col>
							</Row>

							{/* Position Description */}
							<Space orientation="vertical" style={{ width: "100%" }}>
								<div>
									<Text type="secondary" className={styles.fieldLabel}>
										{t(
											"modal.section.vacancyDescription",
											"Position description",
										)}
									</Text>
									<div className={styles.vacancyDescription}>
										{vacancy.data.description}
									</div>
								</div>
								<div className={styles.vacancyDeadline}>
									<Text type="secondary">
										{t(
											"modal.section.theVacancyIsAcuteBefore",
											"The position is acute before",
										)}
										: {dayjs(vacancy.data.finishedAt).format("LL")}
									</Text>
								</div>
							</Space>

							{/* Equity Promise */}
							{!!vacancy.data.promisePercentage &&
								!!vacancy.data.promiseStep?.name && (
									<Alert
										type="success"
										message={`${t("modal.vacancy.equityPromise", "Equity Promise")}: ${vacancy.data.promisePercentage}% ${t(
											"modal.section.equityPromiseDescription",
											"of project equity will be allocated upon reaching the required workflow step {step}",
											{ step: vacancy.data.promiseStep.name },
										)}`}
									/>
								)}

							{/* Status Alerts */}
							{vacancy.data.myTeamMemberId ? (
								<Alert
									type="success"
									message={t(
										"modal.vacancy.applied",
										"You have already responded to this position",
									)}
								/>
							) : null}

							{!session?.data?.user && (
								<Alert
									type="error"
									message={
										<T
											keyName="modal.vacancy.notAuth"
											defaultValue="Only registered users can respond to this position. Please <register-link>register</register-link> or <signin-link>sign in</signin-link>."
											params={{
												"register-link": (chunks: React.ReactNode) => (
													<a href="/registration">{chunks}</a>
												),
												"signin-link": (chunks: React.ReactNode) => (
													<a href="/signin">{chunks}</a>
												),
											}}
										/>
									}
								/>
							)}
						</Space>
					)}
				</Spin>
			</Modal>

			{Boolean(session?.data) && (
				<SpecialitySelectModal
					open={showSpecialitySelectModal}
					onOk={handleSpecialitySelect}
					onCancel={() => setShowSpecialitySelectModal(false)}
				/>
			)}
		</>
	);
};

export default VacancyPreviewModal;
