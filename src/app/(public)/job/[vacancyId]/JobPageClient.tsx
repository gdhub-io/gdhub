"use client";

import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import {
	IconArrowLeft,
	IconCoin,
	IconHeartHandshake,
	IconInfoCircle,
	IconMapPin,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { T, useTranslate } from "@tolgee/react";
import {
	Alert,
	Button,
	Col,
	Flex,
	message,
	Row,
	Tooltip,
	Typography,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useState } from "react";
import Markdown from "react-markdown";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import SpecialitySelectModal from "@/components/modals/SpecialitySelectModal";
import { ProjectAuthorCard } from "@/components/project/ProjectAuthorCard";
import { ProjectGameDetails } from "@/components/project/ProjectGameDetails";
import { ProjectVideoCover } from "@/components/project/ProjectVideoCover";
import { gtmEventTrigger } from "@/helpers/gtm";
import styles from "./styles.module.scss";

const { Text } = Typography;

type VacancyProject = {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	coverImage?: string | null;
	videoLink?: string | null;
	genre?: string | null;
	setting?: string | null;
	audition?: string | null;
	platform?: string | null;
	visualStyle?: string | null;
	author?: {
		name?: string | null;
		image?: string | null;
		profile?: { name?: string | null; motivation?: string | null } | null;
		specialities?: {
			name?: string | null;
			specialization?: string | null;
			level?: string | null;
		}[];
	} | null;
};

export interface JobPageProps {
	vacancy: prismaClient.TeamVacancy & {
		team: { project: VacancyProject } | null;
		promisePercentage: number;
		promiseStep: prismaClient.ProjectWorkflowStep | null;
		myTeamMemberId?: string;
		offeredAmount?: number | null;
		offeredRateType?: prismaClient.PaymentRateType | null;
	};
	pageCover: string | null;
	isAuthenticated: boolean;
}

export function JobPageClient({ vacancy, pageCover }: JobPageProps) {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const router = useRouter();
	const pathname = usePathname();
	const [showSpecialitySelectModal, setShowSpecialitySelectModal] =
		useState(false);

	const project = vacancy.team?.project;

	const { mutateAsync: withdrawApply } = useMutation({
		mutationFn: (data: { teamMemberId: string }) =>
			axios.put<void>("/api/user/project/vacancy/withdraw", data),
		onSuccess: () => {
			gtmEventTrigger("job", {
				action: "withdraw",
				vacancyName: vacancy.title,
				projectName: project?.name,
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
				projectName: project?.name,
			});
		},
	});

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
			: t("page.vacancy.applyAction", "Apply");
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
		} catch (error: any) {
			console.log(error);
			message.error(error.response?.data.message || error.message);
		}
	};

	const hasCompensation = !!vacancy.offeredAmount && !!vacancy.offeredRateType;
	const hasEquity = !!vacancy.promisePercentage && !!vacancy.promiseStep?.name;

	const rateSuffix = vacancy.offeredRateType
		? {
				Hourly: t("vacancy.rate.short.Hourly", "/ hour"),
				OneTime: t("vacancy.rate.short.OneTime", "one-time"),
				Monthly: t("vacancy.rate.short.Monthly", "/ month"),
			}[vacancy.offeredRateType as string]
		: "";

	const compensationText = `€${(vacancy.offeredAmount ?? 0).toLocaleString()} ${rateSuffix}`;

	const equityTooltip = `${vacancy.promisePercentage}% ${t(
		"page.vacancy.section.equityPromiseDescription",
		"of project equity will be allocated upon reaching the required workflow step {step}",
		{ step: vacancy.promiseStep?.name ?? "" },
	)}`;

	return (
		<>
			<PublicPageHeader
				title={vacancy.title}
				subTitle={t(
					"page.vacancy.subtitle",
					"The open position from {project} project",
					{ project: project?.name ?? "" },
				)}
				backgroundImage={pageCover || undefined}
				extraPosition="top"
				extra={
					<Link href="/jobs" className={styles.backLink}>
						<IconArrowLeft size={16} />
						<span>{t("page.vacancy.title", "Jobs")}</span>
					</Link>
				}
			/>

			<div className="layout-background">
				<div className={styles.container}>
					<Row gutter={[32, 32]}>
						<Col xs={{ span: 24, order: 1 }} lg={{ span: 16, order: 0 }}>
							<div className={styles.mainCard}>
								<div className={styles.headBand}>
									<div className={styles.headLeft}>
										<div className={styles.companyRow}>
											<div className={styles.projLogo}>
												{project?.name?.charAt(0)?.toUpperCase() ?? "P"}
											</div>
											<div className={styles.companyMeta}>
												{project?.slug ? (
													<Link
														href={`/project/${project.slug}`}
														className={styles.projName}
													>
														{project?.name}
													</Link>
												) : (
													<span className={styles.projName}>
														{project?.name}
													</span>
												)}
												<span className={styles.metaDot}>•</span>
												<span className={styles.location}>
													<IconMapPin size={15} />
													{t("page.vacancy.remote", "Remote")}
												</span>
											</div>
										</div>

										{(hasCompensation || hasEquity) && (
											<div className={styles.badges}>
												{hasCompensation && (
													<Tooltip
														title={t(
															"page.vacancy.compensationTooltip",
															"Compensation paid by the project for this position.",
														)}
													>
														<span
															className={`${styles.badge} ${styles.badgeBlue}`}
														>
															<IconCoin size={15} />
															{compensationText}
															<IconInfoCircle
																size={13}
																className={styles.badgeInfo}
															/>
														</span>
													</Tooltip>
												)}
												{hasEquity && (
													<Tooltip title={equityTooltip}>
														<span
															className={`${styles.badge} ${styles.badgeGreen}`}
														>
															<IconHeartHandshake size={15} />
															{vacancy.promisePercentage}%{" "}
															{t("page.vacancy.equity", "equity")}
															<IconInfoCircle
																size={13}
																className={styles.badgeInfo}
															/>
														</span>
													</Tooltip>
												)}
											</div>
										)}
									</div>

									<div className={styles.headActions}>
										<Button
											type={vacancy?.myTeamMemberId ? "default" : "primary"}
											size="large"
											onClick={functionOkButton}
										>
											{statusOkButton()}
										</Button>
									</div>
								</div>

								<div className={styles.mainBody}>
									{project?.description && (
										<section className={styles.section}>
											<h3 className={styles.sectionTitle}>
												{t("page.vacancy.aboutProject", "About this project")}
											</h3>
											<div className={styles.prose}>
												<Markdown>
													{project.description.length > 700
														? `${project.description.slice(0, 700)}…`
														: project.description}
												</Markdown>
											</div>
										</section>
									)}

									<section className={styles.section}>
										<h3 className={styles.sectionTitle}>
											{t("page.vacancy.aboutRole", "About this role")}
										</h3>
										<div className={styles.proseRaw}>{vacancy.description}</div>
									</section>

									{!!vacancy.finishedAt && (
										<Text type="secondary" className={styles.relevantTo}>
											{t(
												"page.vacancy.section.theVacancyIsAcuteBefore",
												"The position is relevant to",
											)}
											: <b>{dayjs(vacancy.finishedAt).format("LL")}</b>
										</Text>
									)}

									{vacancy.myTeamMemberId && (
										<Alert
											type="warning"
											message={t(
												"page.vacancy.applied",
												"You have already responded to this position",
											)}
										/>
									)}

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
								</div>
							</div>
						</Col>

						<Col xs={{ span: 24, order: 0 }} lg={{ span: 8, order: 1 }}>
							<Flex vertical gap={16}>
								<ProjectVideoCover
									coverImage={project?.coverImage}
									videoLink={project?.videoLink}
									alt={project?.name}
								/>
								<ProjectGameDetails project={project} />
								<ProjectAuthorCard author={project?.author} />
							</Flex>
						</Col>
					</Row>
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
