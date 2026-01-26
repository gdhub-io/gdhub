import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { TbBrandTelegram } from "@react-icons/all-files/tb/TbBrandTelegram";
import { IconQrcode } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Col,
	ConfigProvider,
	Descriptions,
	Flex,
	Grid,
	Modal,
	QRCode,
	Row,
	Space,
	Tooltip,
	Typography,
} from "antd";
import type { GetServerSidePropsContext } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import type { NextSeoProps } from "next-seo";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import YouTube from "react-youtube";
import rehypeRaw from "rehype-raw";
import type { Options } from "youtube-player/dist/types";
import GDHubLogoImg from "@/assets/images/gdhub-short-logo.png";
import DevlogPosts from "@/components/DevlogPosts";
import ProjectVacancies from "@/components/ProjectVacancies";
import TeamMembers from "@/components/TeamMembers";
import { platformOptions } from "@/helpers/react-content";
import { PublicLayout } from "@/layouts/PublicLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import { prisma } from "@/services/prisma";
import type { ProjectLink } from "@/types/project";
import styles from "./style.module.scss";

const { Title, Paragraph, Text } = Typography;

type ProjectPageParams = {
	project: prismaClient.Project & {
		author: prismaClient.User & {
			profile: { tgNickname: prismaClient.Profile["tgNickname"] };
		};
		workflow: prismaClient.ProjectWorkflow & {
			currentStep: prismaClient.ProjectWorkflowStep;
		};
	};
	seo?: { title: string; description?: string; image?: string };
};

const ProjectPage: NextPageWithLayout<ProjectPageParams> = ({
	project,
	seo,
}) => {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const router = useRouter();
	const screens = Grid.useBreakpoint();
	const [showPitchVideo, setShowPitchVideo] = useState(false);
	const [isQrModalOpen, setIsQrModalOpen] = useState(false);

	const seoParams: NextSeoProps = {
		title: seo?.title,
		description: seo?.description,
		openGraph: {
			description: seo?.description as string,
			images: seo?.image
				? [{ url: seo.image as string, alt: project?.name + " cover image" }]
				: undefined,
		},
	};

	const handleCoverClick = () => setShowPitchVideo(true);

	const getCurrentPageUrl = () => {
		if (typeof window !== "undefined") {
			return window.location.href;
		}
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		return `${baseUrl}${router.asPath}`;
	};

	if (!project) return null;

	const generalData = (
		<div className={styles.projectMeta}>
			<Descriptions
				size="small"
				layout={screens.md ? "horizontal" : "vertical"}
				column={1}
			>
				<Descriptions.Item label={t("page.project.genre", "Genre")}>
					{project.genre}
				</Descriptions.Item>
				<Descriptions.Item label={t("page.project.setting", "Game Setting")}>
					{project.setting}
				</Descriptions.Item>
				<Descriptions.Item label={t("page.project.audition", "Audition")}>
					{project.audition}
				</Descriptions.Item>
				<Descriptions.Item label={t("page.project.platform", "Platform")}>
					{project.platform}
				</Descriptions.Item>
				<Descriptions.Item
					label={t("page.project.visualStyle", "Visual Style")}
				>
					{project.visualStyle}
				</Descriptions.Item>
			</Descriptions>
		</div>
	);

	const pitchVideoOptions: Options = {
		playerVars: { disablekb: 1, autoplay: showPitchVideo ? 1 : 0 },
	};

	const getPlatformIcon = (type: string) => {
		const option = platformOptions.find((opt) => opt.value === type);
		return option?.icon;
	};

	const getPlatformLabel = (type: string) => {
		const option = platformOptions.find((opt) => opt.value === type);
		return option?.label;
	};

	const renderProjectLinks = (links: ProjectLink[]) => {
		const linkElements = links
			.sort((a, b) => (a.isPrimary ? -1 : 1))
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
				</Flex>
			</ConfigProvider>
		);
	};

	return (
		<PublicLayout
			title={project?.name}
			subTitle={`${t("Author")} ${project.author.name}`}
			subLine={renderProjectLinks(project.links as ProjectLink[])}
			backgroundImage={project.coverImage || undefined}
			seo={seoParams}
		>
			{/* <NextSeo {...seoParams} /> */}

			<div className={styles.container}>
				<Row gutter={[32, 16]}>
					<Col
						xs={{ span: 24, order: 1 }}
						md={{ span: 12, order: 0 }}
						lg={{ span: 16, order: 0 }}
					>
						<Space direction="vertical" size={64} style={{ width: "100%" }}>
							<div className="project-description">
								<Title level={2}>
									{t("page.project.aboutGame", "About Game")}
								</Title>
								<Paragraph>
									<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>
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

							<ProjectVacancies teamId={project.teamId} />

							<DevlogPosts projectId={project.id} />
						</Space>
					</Col>
					<Col
						xs={{ span: 24, order: 0 }}
						md={{ span: 12, order: 1 }}
						lg={{ span: 8, order: 1 }}
					>
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
						{showPitchVideo && project.videoLink && (
							<YouTube
								className={styles.videoCover}
								videoId={project.videoLink}
								opts={pitchVideoOptions}
								onEnd={() => setShowPitchVideo(false)}
							/>
						)}
						{screens.md && generalData}
						{session && project.author.profile.tgNickname ? (
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

						<div className="project-team">
							<TeamMembers teamId={project.teamId} />
						</div>
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
						"Scan to share {projectName}",
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
					<QRCode
						type="svg"
						value={getCurrentPageUrl()}
						size={312}
						icon={GDHubLogoImg.src}
						iconSize={64}
					/>
				</Flex>
			</Modal>
		</PublicLayout>
	);
};

export const getServerSideProps = async (
	context: GetServerSidePropsContext,
) => {
	const { projectSlug }: any = context.params;

	const project = await prisma.project.findFirst({
		where: {
			slug: projectSlug,
			// status: { notIn: [prismaClient.ProjectStatus.Approved, prismaClient.ProjectStatus.Done] },
		},
		include: {
			author: {
				select: { name: true, profile: { select: { tgNickname: true } } },
			},
			workflow: { select: { currentStep: { select: { name: true } } } },
		},
	});

	if (!project) {
		return {
			notFound: true,
		};
	}

	return {
		props: {
			project: {
				...project,
				createdAt: project.createdAt.toISOString(),
				updatedAt: project.updatedAt.toISOString(),
				startedAt: project.startedAt?.toISOString(),
				finishedAt: project.finishedAt
					? project.finishedAt.toISOString()
					: null,
				workflow: project.workflow
					? {
							...project.workflow,
							currentStep: project.workflow.currentStep || null,
						}
					: null,
			},
			seo: {
				title: project.name || null,
				description: project.description?.slice(0, 160) || null,
				image: `${process.env.NEXT_PUBLIC_APP_URL}/api/og?t=${project.name}&st=Author%20${project.author.name}&img=${project.coverImage}`,
			},
		},
	};
};

export default ProjectPage;
