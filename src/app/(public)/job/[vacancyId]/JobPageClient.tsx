"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useMutation } from "@tanstack/react-query";
import { T, useTranslate } from "@tolgee/react";
import {
	Alert,
	Button,
	Card,
	Col,
	Flex,
	message,
	Row,
	Space,
	Spin,
	Typography,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useState } from "react";
import Markdown from "react-markdown";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import SpecialitySelectModal from "@/components/modals/SpecialitySelectModal";
import { gtmEventTrigger } from "@/helpers/gtm";
import { getVideoPoster, toPlayableVideoUrl } from "@/helpers/video";
import styles from "./styles.module.scss";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const { Text, Title } = Typography;

export interface JobPageProps {
	vacancy: prismaClient.TeamVacancy & {
		team: { project: prismaClient.Project };
		promisePercentage: number;
		promiseStep: prismaClient.ProjectWorkflowStep;
		myTeamMemberId: string;
	};
	pageCover: string | null;
	isAuthenticated: boolean;
}

export function JobPageClient({ vacancy, pageCover }: JobPageProps) {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const router = useRouter();
	const pathname = usePathname();
	const [showPitchVideo, setShowPitchVideo] = useState(false);
	const [showSpecialitySelectModal, setShowSpecialitySelectModal] =
		useState(false);

	const { mutateAsync: withdrawApply } = useMutation({
		mutationFn: (data: { teamMemberId: string }) =>
			axios.put<void>("/api/user/project/vacancy/withdraw", data),
		onSuccess: () => {
			gtmEventTrigger("job", {
				action: "withdraw",
				vacancyName: vacancy.title,
				projectName: vacancy.team?.project?.name,
			});
		},
	});

	const { mutateAsync: vacancyApply } = useMutation({
		mutationFn: (data: {
			specialityId: string;
			contactType: string[];
			telegramNickname?: string;
			vacancyId: string;
		}) => axios.post<void>("/api/user/project/vacancy/apply", data),
		onSuccess: () => {
			gtmEventTrigger("job", {
				action: "apply",
				vacancyName: vacancy.title,
				projectName: vacancy.team?.project?.name,
			});
		},
	});

	const handleCoverClick = () => setShowPitchVideo(true);

	const withdrawApplyHandler = async (data: { teamMemberId: string }) => {
		try {
			await withdrawApply(data);
			router.refresh();
			message.success(
				t("page.vacancy.withdrawSuccess", "Your response is withdrawn"),
			);
		} catch (error: any) {
			console.log(error);
			message.error(error.response?.data.message || error.message);
		}
	};

	const functionOkButton = async () => {
		if (!session) {
			router.push(`/signin?callbackUrl=${pathname}`);
		}

		return vacancy?.myTeamMemberId
			? withdrawApplyHandler({ teamMemberId: vacancy.myTeamMemberId })
			: setShowSpecialitySelectModal(true);
	};

	const statusOkButton = () => {
		if (!session) return t("signin", "Signin");
		return vacancy?.myTeamMemberId
			? t("modal.vacancy.cancelMyResponse", "Cancel my response")
			: t("modal.vacancy.apply", "Respond");
	};

	const handleSpecialitySelect = async ({
		specialityId,
		contactType,
		telegramNickname,
	}: {
		specialityId: any;
		contactType: string[];
		telegramNickname?: string;
	}) => {
		if (!vacancy) return;

		try {
			await vacancyApply({
				specialityId,
				contactType,
				telegramNickname,
				vacancyId: vacancy.id,
			});

			router.refresh();
			message.success(t("page.vacancy.applySuccess", "Your response is sent"));
			setShowSpecialitySelectModal(false);
			setTimeout(() => setShowSpecialitySelectModal(false), 600);
		} catch (error: any) {
			console.log(error);
			message.error(error.response?.data.message || error.message);
		}
	};

	return (
		<>
			<PublicPageHeader
				title={
					<div className={styles.titleContainer}>
						<Link href={`/jobs`}>
							<Button
								type="text"
								size="small"
								className={styles.projectTitle}
								onMouseEnter={(e) => {
									const button = e.currentTarget;
									const arrow = button.querySelector(".arrow") as HTMLElement;
									if (arrow) {
										arrow.style.width = "16px";
										arrow.style.marginRight = "8px";
										arrow.style.opacity = "1";
									}
									button.style.paddingLeft = "8px";
									button.style.paddingRight = "8px";
								}}
								onMouseLeave={(e) => {
									const button = e.currentTarget;
									const arrow = button.querySelector(".arrow") as HTMLElement;
									if (arrow) {
										arrow.style.width = "0";
										arrow.style.marginRight = "0";
										arrow.style.opacity = "0";
									}
									button.style.paddingLeft = "0";
									button.style.paddingRight = "0";
								}}
							>
								<Space size={0}>
									<ArrowLeftOutlined
										className="arrow"
										style={{
											width: 0,
											marginRight: 0,
											opacity: 0,
											transition: "all 0.3s ease",
											overflow: "hidden",
											color: "#ff4d4f",
										}}
									/>
									<span style={{ color: "#ff4d4f" }}>
										{t("page.vacancy.title", "Jobs")}
									</span>
								</Space>
							</Button>
						</Link>
						<Title className={styles.title}>
							{t("page.vacancy.title", vacancy.title)}
						</Title>
					</div>
				}
				subTitle={`The open position from ${vacancy.team?.project?.name} project`}
				backgroundImage={pageCover || undefined}
			/>
			<div className="layout-background">
				<div className={styles.container}>
					<Spin spinning={false}>
						{!!vacancy && (
							<Card
								actions={
									session?.user
										? [
												<Button
													key="action"
													type={vacancy?.myTeamMemberId ? "default" : "primary"}
													onClick={functionOkButton}
												>
													{statusOkButton()}
												</Button>,
											]
										: undefined
								}
							>
								<Flex vertical gap={24}>
									<Row gutter={[24, 24]}>
										<Col xs={24} md={14}>
											<Space orientation="vertical" style={{ width: "100%" }}>
												<div>
													<Text className={styles.fieldLabel}>
														{t("page.vacancy.section.project", "Project")}
													</Text>
													<Title level={4} style={{ margin: "8px 0" }}>
														<Link
															href={`/project/${vacancy.team?.project?.slug}`}
														>
															{vacancy.team?.project?.name}
														</Link>
													</Title>
												</div>

												{vacancy.team?.project?.description && (
													<div>
														<Text className={styles.fieldLabel}>
															{t(
																"page.vacancy.section.projectDescription",
																"Project description",
															)}
														</Text>
														<Markdown>
															{vacancy.team.project.description.length > 512
																? `${vacancy.team.project.description.slice(0, 512)}...(more on the project page)`
																: vacancy.team.project.description}
														</Markdown>
													</div>
												)}
											</Space>
										</Col>

										<Col xs={24} md={10}>
											{!showPitchVideo && vacancy.team?.project?.coverImage && (
												<div className={styles.projectCover}>
													{vacancy.team?.project?.videoLink && (
														<div className={styles.coverButtonContainer}>
															<Button
																onClick={handleCoverClick}
																type="primary"
																size="small"
															>
																{t("page.vacancy.section.watch", "Watch")}
															</Button>
														</div>
													)}
													<Image
														src={vacancy.team?.project?.coverImage}
														alt="Project cover"
														fill
														style={{ objectFit: "cover" }}
													/>
												</div>
											)}
											{vacancy.team.project.videoLink &&
												(showPitchVideo ||
													!vacancy.team?.project?.coverImage) && (
													<div className={styles.videoContainer}>
														<ReactPlayer
															src={toPlayableVideoUrl(
																vacancy.team.project.videoLink,
															)}
															light={
																showPitchVideo
																	? false
																	: getVideoPoster(
																			vacancy.team.project.videoLink,
																		) || true
															}
															playing={showPitchVideo}
															onClickPreview={() => setShowPitchVideo(true)}
															controls
															width="100%"
															height="100%"
															onEnded={() => setShowPitchVideo(false)}
														/>
													</div>
												)}
										</Col>
									</Row>

									<Space orientation="vertical" style={{ width: "100%" }}>
										<div>
											<Text className={styles.fieldLabel}>
												{t(
													"page.vacancy.section.vacancyDescription",
													"Position description",
												)}
											</Text>
											<div style={{ whiteSpace: "pre-wrap" }}>
												{vacancy.description}
											</div>
										</div>
									</Space>

									<Space>
										<Text>
											{t(
												"page.vacancy.section.theVacancyIsAcuteBefore",
												"The position is relevant to",
											)}
											:
										</Text>
										<Text strong>{dayjs(vacancy.finishedAt).format("LL")}</Text>
									</Space>

									{!!vacancy.promisePercentage &&
										!!vacancy.promiseStep?.name && (
											<Flex vertical gap={8}>
												<Text className={styles.fieldLabel}>
													{t(
														"page.vacancy.section.termsOfCooperation",
														"Terms of cooperation",
													)}
												</Text>

												<Alert
													type="success"
													message={`${t("page.vacancy.equityPromise", "Equity Promise")}: ${vacancy.promisePercentage}% ${t(
														"page.vacancy.section.equityPromiseDescription",
														"of project equity will be allocated upon reaching the required workflow step {step}",
														{ step: vacancy.promiseStep.name },
													)}`}
												/>
											</Flex>
										)}

									{vacancy.myTeamMemberId ? (
										<Alert
											type="warning"
											message={t(
												"page.vacancy.applied",
												"You have already responded to this position",
											)}
										/>
									) : null}

									{!session?.user && (
										<Alert
											type="error"
											message={
												<T
													keyName="page.vacancy.notAuth"
													defaultValue={t(
														"page.vacancy.notAuth",
														"Only registered users can respond to this position. Please <register-link>register</register-link> or <signin-link>sign in</signin-link>.",
													)}
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
								</Flex>
							</Card>
						)}
					</Spin>
				</div>

				{Boolean(session) && (
					<SpecialitySelectModal
						open={showSpecialitySelectModal}
						onOk={handleSpecialitySelect}
						onCancel={() => setShowSpecialitySelectModal(false)}
					/>
				)}
			</div>
		</>
	);
}
