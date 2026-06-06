"use client";

import HappyProvider from "@ant-design/happy-work-theme/es/HappyProvider";
import { LoadingOutlined } from "@ant-design/icons";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { TbBrandTelegram } from "@react-icons/all-files/tb/TbBrandTelegram";
import { IconDownload, IconQrcode } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Col,
	ConfigProvider,
	Flex,
	Grid,
	Modal,
	QRCode,
	Row,
	Space,
	Tooltip,
	Typography,
} from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import type { Pluggable } from "unified";
import GDHubLogoImg from "@/assets/images/gdhub-short-logo.png";
import applauseDefaultAnimation from "@/assets/images/icons/applaause-default.json";
import DevlogPosts from "@/components/DevlogPosts";
import {
	getHubSectionShellClass,
	HubSectionBleed,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import ProjectVacancies from "@/components/ProjectVacancies";
import TeamMembers from "@/components/TeamMembers";
import { platformOptions } from "@/helpers/react-content";
import { getVideoPoster, toPlayableVideoUrl } from "@/helpers/video";
import type { ProjectLink } from "@/types/project";
import styles from "./style.module.scss";

const { Title, Paragraph, Text } = Typography;
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

export type ProjectPageParams = {
	project: Omit<
		prismaClient.Project,
		| "createdAt"
		| "updatedAt"
		| "startedAt"
		| "finishedAt"
		| "archivedAt"
		| "killedWithDignityAt"
		| "dormantAt"
		| "statusChangedAt"
	> & {
		createdAt: string;
		updatedAt: string;
		startedAt: string | null;
		finishedAt: string | null;
		archivedAt: string | null;
		killedWithDignityAt: string | null;
		dormantAt: string | null;
		statusChangedAt: string | null;
		author: {
			name: prismaClient.User["name"];
			profile: { tgNickname: prismaClient.Profile["tgNickname"] } | null;
		};
		workflow: {
			currentStep: { name: prismaClient.ProjectWorkflowStep["name"] } | null;
		} | null;
		team: { id: string } | null;
	};
	projectApplauseCount: number;
	isAuthenticated: boolean;
	seo?: { title?: string | null; description?: string | null; image?: string };
};

export function ProjectPageClient({
	project,
	projectApplauseCount,
	isAuthenticated,
	seo,
}: ProjectPageParams) {
	const { t } = useTranslate();
	const { data: session, status: authStatus } = useSession();
	const pathname = usePathname();
	const screens = Grid.useBreakpoint();
	const [showPitchVideo, setShowPitchVideo] = useState(false);
	const [isQrModalOpen, setIsQrModalOpen] = useState(false);
	const [applauseCount, setApplauseCount] = useState(projectApplauseCount || 0);
	const [hasApplauded, setHasApplauded] = useState(false);
	const [isApplauseLoading, setIsApplauseLoading] = useState(false);
	const [isApplauseStateLoading, setIsApplauseStateLoading] = useState(false);
	const [applauseAnimationToken, setApplauseAnimationToken] = useState(0);
	const applauseRequestIdRef = useRef(0);

	const isUserAuthenticated =
		authStatus === "authenticated" ||
		(authStatus === "loading" && isAuthenticated);

	const handleCoverClick = () => setShowPitchVideo(true);

	useEffect(() => {
		setApplauseCount(projectApplauseCount || 0);
	}, [projectApplauseCount]);

	useEffect(() => {
		if (!isUserAuthenticated) {
			setHasApplauded(false);
			setIsApplauseStateLoading(false);
			return;
		}

		let isMounted = true;
		const requestId = ++applauseRequestIdRef.current;
		setIsApplauseStateLoading(true);

		axios
			.get(`/api/project/${project.id}/applause`)
			.then(({ data }) => {
				if (!isMounted || requestId !== applauseRequestIdRef.current) {
					return;
				}

				setApplauseCount(data.count || 0);
				setHasApplauded(!!data.hasApplauded);
			})
			.catch((error) => {
				console.error("Error fetching project applause state:", error);
			})
			.finally(() => {
				if (!isMounted || requestId !== applauseRequestIdRef.current) {
					return;
				}

				setIsApplauseStateLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, [isUserAuthenticated, project.id]);

	const getCurrentPageUrl = () => {
		if (typeof window !== "undefined") {
			return window.location.href;
		}
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		return `${baseUrl}${pathname ?? ""}`;
	};

	if (!project) return null;

	const aboutGameItems: { label: string; value: ReactNode }[] = [
		{ label: t("page.project.genre", "Genre"), value: project.genre },
		{
			label: t("page.project.setting", "Game Setting"),
			value: project.setting,
		},
		{ label: t("page.project.audition", "Audition"), value: project.audition },
		{ label: t("page.project.platform", "Platform"), value: project.platform },
		{
			label: t("page.project.visualStyle", "Visual Style"),
			value: project.visualStyle,
		},
	].filter((item) => !!item.value);

	const generalData = aboutGameItems.length ? (
		<section className={getHubSectionShellClass("sidebar")}>
			<HubSectionHeader title={t("page.project.aboutGame", "Game details")} />
			<HubSectionBody>
				<HubSectionBleed>
					<Flex vertical>
						{aboutGameItems.map((item) => (
							<Flex
								key={item.label}
								justify="space-between"
								align="flex-start"
								gap={12}
								className={styles.aboutGameItem}
							>
								<Text type="secondary" className={styles.aboutGameLabel}>
									{item.label}
								</Text>
								<Text className={styles.aboutGameValue}>{item.value}</Text>
							</Flex>
						))}
					</Flex>
				</HubSectionBleed>
			</HubSectionBody>
		</section>
	) : null;

	const getPlatformIcon = (type: string) => {
		const option = platformOptions.find((opt) => opt.value === type);
		return option?.icon;
	};

	const getPlatformLabel = (type: string) => {
		const option = platformOptions.find((opt) => opt.value === type);
		return option?.label;
	};

	const markdownRehypePlugins = [rehypeRaw] as Pluggable[];

	const handleApplauseToggle = async () => {
		if (!isUserAuthenticated || isApplauseLoading || isApplauseStateLoading) {
			return;
		}

		applauseRequestIdRef.current += 1;

		const nextHasApplauded = !hasApplauded;
		const nextCount = Math.max(0, applauseCount + (nextHasApplauded ? 1 : -1));

		setIsApplauseLoading(true);
		setHasApplauded(nextHasApplauded);
		setApplauseCount(nextCount);

		if (nextHasApplauded) {
			setApplauseAnimationToken((value) => value + 1);
		}

		try {
			const { data } = await axios.request({
				url: `/api/project/${project.id}/applause`,
				method: nextHasApplauded ? "POST" : "DELETE",
			});

			setHasApplauded(!!data.hasApplauded);
			setApplauseCount(data.count || 0);
		} catch (error) {
			console.error("Error toggling project applause:", error);
			setHasApplauded(hasApplauded);
			setApplauseCount(applauseCount);
		} finally {
			setIsApplauseLoading(false);
		}
	};

	const applauseButton = (
		<Tooltip
			title={
				isUserAuthenticated
					? t("page.devlog.applauseTooltip", "Rate the team's work")
					: t(
							"page.devlog.applauseAuthTooltip",
							"Only authorized users can leave applause",
						)
			}
		>
			<span className={styles.projectApplauseWrapper}>
				<HappyProvider>
					<Button
						type="text"
						className={`${styles.projectApplauseButton} ${
							hasApplauded ? styles.projectApplauseButtonActive : ""
						}`}
						icon={
							<span
								className={styles.projectApplauseIcon}
								style={{ width: 33, height: 33 }}
							>
								{isApplauseStateLoading ? (
									<LoadingOutlined
										spin
										style={{ fontSize: 33, lineHeight: 1 }}
									/>
								) : (
									<Lottie
										key={`${hasApplauded ? "active" : "default"}-${applauseAnimationToken}`}
										animationData={applauseDefaultAnimation}
										autoplay={hasApplauded && applauseAnimationToken > 0}
										loop={false}
										className={styles.projectApplauseIconAnimation}
									/>
								)}
							</span>
						}
						onClick={handleApplauseToggle}
						disabled={
							!isUserAuthenticated ||
							isApplauseLoading ||
							isApplauseStateLoading
						}
					>
						{applauseCount > 0 ? applauseCount : null}
					</Button>
				</HappyProvider>
			</span>
		</Tooltip>
	);

	const renderProjectLinks = (links: ProjectLink[]) => {
		const linkElements = links
			.sort((a, _b) => (a.isPrimary ? -1 : 1))
			.map((link: ProjectLink) => {
				return link.isPrimary ? (
					<Button
						key={link.platform}
						type={link.isPrimary ? "default" : "text"}
						className={styles.projectLink}
						href={link.link}
						target="_blank"
					>
						<Flex align="center" gap={8}>
							{getPlatformIcon(link.platform)}
							Go to {getPlatformLabel(link.platform)}
						</Flex>
					</Button>
				) : (
					<Tooltip
						key={`tooltip-${link.platform}`}
						title={`Go to ${getPlatformLabel(link.platform)}`}
					>
						<Button
							key={link.platform}
							type="text"
							className={styles.projectLink}
							href={link.link}
							target="_blank"
							icon={getPlatformIcon(link.platform)}
						/>
					</Tooltip>
				);
			});

		return (
			<ConfigProvider
				theme={{
					components: { Button: { controlHeight: 36, paddingInline: 16 } },
				}}
			>
				<Flex align="center" gap={16} style={{ margin: "16px 0 0" }}>
					{linkElements}

					<Tooltip key={`tooltip-qr-code`} title={`QR Code`}>
						<Button
							key={`qr-code`}
							type="text"
							className={styles.projectLink}
							icon={<IconQrcode />}
							onClick={() => setIsQrModalOpen(true)}
						/>
					</Tooltip>

					{applauseButton}
				</Flex>
			</ConfigProvider>
		);
	};

	// for modal qr code
	function doDownload(url: string, fileName: string) {
		const a = document.createElement("a");
		a.download = fileName;
		a.href = url;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	const downloadCanvasQRCode = () => {
		const canvas = document
			.getElementById("project-qr-code")
			?.querySelector<HTMLCanvasElement>("canvas");
		if (canvas) {
			const url = canvas.toDataURL();
			doDownload(url, "project-qr-code.png");
		}
	};

	return (
		<>
			<PublicPageHeader
				title={project?.name}
				subTitle={`${t("Author")} ${project.author.name}`}
				subLine={renderProjectLinks(project.links as ProjectLink[])}
				backgroundImage={project.coverImage || undefined}
			/>

			<div className="layout-background">
				<div className={styles.container}>
					<Row gutter={[32, 16]}>
						<Col
							xs={{ span: 24, order: 1 }}
							md={{ span: 12, order: 0 }}
							lg={{ span: 16, order: 0 }}
						>
							<Space orientation="vertical" size={64} style={{ width: "100%" }}>
								<div className="project-description">
									<Title level={2}>
										{t("page.project.aboutGame", "About Game")}
									</Title>
									<Paragraph>
										<ReactMarkdown rehypePlugins={markdownRehypePlugins}>
											{project.description || ""}
										</ReactMarkdown>
									</Paragraph>
									{!!project.workflow?.currentStep && (
										<Paragraph type="secondary">
											{t("page.project.developmentStage", "Development stage")}:{" "}
											{project.workflow.currentStep.name}
										</Paragraph>
									)}
								</div>

								{!screens.md && generalData}

								{project.team?.id && (
									<ProjectVacancies teamId={project.team.id} />
								)}

								<DevlogPosts
									projectId={project.id}
									variant="hub"
									headerStyle="title"
									title={t("page.hub.project-updates", "Project updates")}
								/>
							</Space>
						</Col>
						<Col
							xs={{ span: 24, order: 0 }}
							md={{ span: 12, order: 1 }}
							lg={{ span: 8, order: 1 }}
						>
							<Flex vertical gap={16}>
								{!showPitchVideo && !!project.coverImage && (
									<div className={styles.cover}>
										{project.videoLink && (
											<div className={styles.coverButtonContainer}>
												<Button onClick={handleCoverClick} type="primary">
													{t(
														"page.project.viewThePresentation",
														"View the presentation",
													)}
												</Button>
											</div>
										)}
										<Image src={project.coverImage} alt="cover" fill />
									</div>
								)}
								{project.videoLink &&
									(showPitchVideo || !project.coverImage) && (
										<div className={styles.videoCover}>
											<ReactPlayer
												src={toPlayableVideoUrl(project.videoLink)}
												light={
													showPitchVideo
														? false
														: getVideoPoster(project.videoLink) || true
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
								{screens.md && generalData}
								{session && project.author.profile?.tgNickname ? (
									<Link
										href={`https://t.me/${project.author.profile.tgNickname}`}
										target="_blank"
										style={{ display: "block", width: "fit-content" }}
									>
										<Button
											shape="round"
											type="dashed"
											className={styles.writeToAuthorButton}
										>
											<TbBrandTelegram size={16} />{" "}
											{t("page.project.contactTheAuthor", "Contact the author")}
										</Button>
									</Link>
								) : null}

								{project.team?.id && (
									<TeamMembers teamId={project.team.id} variant="hubSidebar" />
								)}
							</Flex>
						</Col>
					</Row>
				</div>

				<Modal
					title={t("page.project.qrCode", "Scan QR Code")}
					width={400}
					styles={{
						header: {
							textAlign: "center",
						},
						body: {
							textAlign: "center",
						},
					}}
					open={isQrModalOpen}
					onCancel={() => setIsQrModalOpen(false)}
					footer={null}
					centered
				>
					<Text type="secondary" style={{ textAlign: "center", fontSize: 21 }}>
						{t(
							"page.project.scanToShare",
							"Scan to share {projectName} on gdhub.io",
							{ projectName: project.name },
						)}
					</Text>
					<Flex
						justify="center"
						align="center"
						vertical
						gap={16}
						style={{ padding: "24px 0" }}
					>
						{/** biome-ignore lint/correctness/useUniqueElementIds: <need for download> */}
						<div id="project-qr-code">
							<QRCode
								type="canvas"
								value={getCurrentPageUrl()}
								size={312}
								icon={GDHubLogoImg.src}
								iconSize={64}
							/>
						</div>
					</Flex>

					<Button
						type="text"
						onClick={downloadCanvasQRCode}
						icon={<IconDownload size={16} />}
					>
						{t("page.project.downloadAsImage", "Download as image")}
					</Button>
				</Modal>
			</div>
		</>
	);
}
