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
/* eslint-disable @next/next/no-img-element */
import type React from "react";
import { useState } from "react";
import Markdown from "react-markdown";
import SpecialitySelectModal from "@/components/modals/SpecialitySelectModal";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "@/pages/job/[vacancyId]/styles.module.scss";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const { Text, Title, Paragraph } = Typography;

type VacancyPageProps = {
	vacancy:
		| (prismaClient.TeamVacancy & {
				team: { project: prismaClient.Project };
				promisePercentage: number;
				promiseStep: prismaClient.ProjectWorkflowStep;
				myTeamMemberId: string;
		  })
		| null;
	pageCover: string | null;
};

export default function VacancyClient({ vacancy, pageCover }: VacancyPageProps) {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const router = useRouter();
	const pathname = usePathname();
	const [showPitchVideo, setShowPitchVideo] = useState(false);
	const [showSpecialitySelectModal, setShowSpecialitySelectModal] = useState(false);

	const { mutateAsync: withdrawApply } = useMutation({
		mutationFn: (data: { teamMemberId: string }) =>
			axios.put<void>("/api/user/project/vacancy/withdraw", data),
	});

	const { mutateAsync: vacancyApply } = useMutation({
		mutationFn: (data: {
			specialityId: string;
			contactType: string[];
			telegramNickname?: string;
			vacancyId: string;
		}) => axios.post<void>("/api/user/project/vacancy/apply", data),
	});

	const handleCoverClick = () => setShowPitchVideo(true);

	const reload = () => router.refresh();

  const withdrawApplyHandler = async (data: { teamMemberId: string }) => {
    try {
      await withdrawApply(data);
      reload();
      message.success(t("page.vacancy.withdrawSuccess", "Your response is withdrawn"));
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } ; message?: string };
      message.error(err.response?.data?.message || err.message || "Unknown error");
    }
  };

	const functionOkButton = async () => {
		if (!session) {
			router.push(`/signin?callbackUrl=${encodeURIComponent(pathname || "/")}`);
			return;
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
		specialityId: string;
		contactType: string[];
		telegramNickname?: string;
	}) => {
		if (!vacancy) return;
    try {
      await vacancyApply({ specialityId, contactType, telegramNickname, vacancyId: vacancy.id });
      reload();
      message.success(t("page.vacancy.applySuccess", "Your response is sent"));
      setShowSpecialitySelectModal(false);
      setTimeout(() => setShowSpecialitySelectModal(false), 600);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } ; message?: string };
      message.error(err.response?.data?.message || err.message || "Unknown error");
    }
	};

	if (!vacancy) return null;

	return (
		<PublicLayout
			title={
				<div className={styles.titleContainer}>
					<Link href={`/jobs`}>
						<Button type="text" size="small" className={styles.projectTitle}>
							<Space size={0}>
								<ArrowLeftOutlined className="arrow" style={{ color: "#ff4d4f" }} />
								<span style={{ color: "#ff4d4f" }}>{t("page.vacancy.title", "Jobs")}</span>
							</Space>
						</Button>
					</Link>
					<Title className={styles.title}>{t("page.vacancy.title", vacancy.title)}</Title>
				</div>
			}
			subTitle={`The open vacancy from ${vacancy.team?.project?.name} project`}
			backgroundImage={pageCover || undefined}
			seo={{ title: `${vacancy.title}` }}
			styles={{ content: { padding: 0 }, layoutBackground: { padding: 0 } }}
			ogImageType="job"
			ogImageParams={{
				p: vacancy.team?.project?.name || "",
				vTerms: vacancy.promisePercentage?.toString() || "",
				vDate: dayjs(vacancy.finishedAt).format("ll"),
			}}
		>
			<div className={styles.container}>
				<Spin spinning={false}>
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
									<Space direction="vertical" style={{ width: "100%" }}>
										<div>
											<Text className={styles.fieldLabel}>
												{t("page.vacancy.section.project", "Project")}
											</Text>
											<Title level={4} style={{ margin: "8px 0" }}>
												{vacancy.team?.project?.name}
											</Title>
										</div>
										{vacancy.team?.project?.description && (
											<div>
												<Text className={styles.fieldLabel}>
													{t("page.vacancy.section.projectDescription", "Project description")}
												</Text>
												<Paragraph style={{ margin: "8px 0" }}>
													{vacancy.team.project.description.slice(0, 200)}
													{vacancy.team.project.description.length > 200 && "..."}
												</Paragraph>
											</div>
										)}
									</Space>
								</Col>
								<Col xs={24} md={10}>
									{!showPitchVideo && vacancy.team?.project?.coverImage && (
										<div className={styles.projectCover}>
											{vacancy.team?.project?.videoLink && (
												<div className={styles.coverButtonContainer}>
													<Button onClick={handleCoverClick} type="primary" size="small">
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
									{showPitchVideo && vacancy.team.project.videoLink && (
										<div className={styles.videoContainer}>
											<ReactPlayer
												url={`https://www.youtube.com/watch?v=${vacancy.team.project.videoLink}`}
												width="100%"
												height="200px"
												controls
											/>
										</div>
									)}
								</Col>
							</Row>

							<Space direction="vertical" style={{ width: "100%" }}>
								<div>
									<Text className={styles.fieldLabel}>
										{t("page.vacancy.section.vacancyDescription", "Vacancy description")}
									</Text>
									<Title level={4} style={{ margin: "8px 0" }}>
										<Markdown>{vacancy.description}</Markdown>
									</Title>
								</div>
							</Space>

							<Space>
								<Text>
									{t("page.vacancy.section.theVacancyIsAcuteBefore", "The vacancy is relevant to")}:
								</Text>
								<Text strong>{dayjs(vacancy.finishedAt).format("LL")}</Text>
							</Space>

							{!!vacancy.promisePercentage && !!vacancy.promiseStep?.name && (
								<Flex vertical gap={8}>
									<Text className={styles.fieldLabel}>
										{t("page.vacancy.section.termsOfCooperation", "Terms of cooperation")}
									</Text>
									<Alert
										type="success"
										message={`${t("page.vacancy.equityPromise", "Equity Promise")}: ${vacancy.promisePercentage}% ${t("page.vacancy.section.equityPromiseDescription", "of project equity will be allocated upon reaching the required workflow step {step}", { step: vacancy.promiseStep.name })}`}
									/>
								</Flex>
							)}

							{vacancy.myTeamMemberId ? (
								<Alert
									type="warning"
									message={t("page.vacancy.applied", "You have already responded to this vacancy")}
								/>
							) : null}

							{!session?.user && (
								<Alert
									type="error"
									message={
										<T
											keyName="page.vacancy.notAuth"
											defaultValue="Only registered users can respond to this vacancy. Please <register-link>register</register-link> or <signin-link>sign in</signin-link>."
											params={{
												"register-link": (chunks: React.ReactNode) => (
													<a href="/registration">{chunks}</a>
												),
												"signin-link": (chunks: React.ReactNode) => <a href="/signin">{chunks}</a>,
											}}
										/>
									}
								/>
							)}
						</Flex>
					</Card>
				</Spin>
			</div>

			{Boolean(session) && (
				<SpecialitySelectModal
					open={showSpecialitySelectModal}
					onOk={handleSpecialitySelect}
					onCancel={() => setShowSpecialitySelectModal(false)}
				/>
			)}
		</PublicLayout>
	);
}
