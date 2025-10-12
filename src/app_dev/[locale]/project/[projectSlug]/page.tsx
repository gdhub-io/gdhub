import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { TbBrandTelegram } from "@react-icons/all-files/tb/TbBrandTelegram";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Col,
	ConfigProvider,
	Descriptions,
	Flex,
	Grid,
	Row,
	Space,
	Tooltip,
	Typography,
} from "antd";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import ReactMarkdown from "react-markdown";
import YouTube from "react-youtube";
import rehypeRaw from "rehype-raw";
import type { Options } from "youtube-player/dist/types";
import DevlogPosts from "@/components/DevlogPosts";
import ProjectVacancies from "@/components/ProjectVacancies";
import TeamMembers from "@/components/TeamMembers";
import { platformOptions } from "@/helpers/react-content";
import { PublicLayout } from "@/layouts/PublicLayout";
import { prisma } from "@/services/prisma";
import type { ProjectLink } from "@/types/project";
import styles from "./style.module.scss";

export const revalidate = 300;

const { Title, Paragraph, Text } = Typography;

async function getProject(projectSlug: string) {
	const project = await prisma.project.findFirst({
		where: { slug: projectSlug },
		include: {
			author: { select: { name: true, profile: { select: { tgNickname: true } } } },
			workflow: { select: { currentStep: { select: { name: true } } } },
		},
	});
	if (!project) return null;
	return project;
}

export default async function ProjectPage({ params }: { params: { projectSlug: string } }) {
	const project = await getProject(params.projectSlug);
	if (!project) return null;

	const t = (key: string, fallback?: string) => fallback || key;
	const screens = { md: true } as any;
	const [showPitchVideo] = [false];
	const seo = {
		title: project.name || null,
		description: project.description?.slice(0, 160) || undefined,
		openGraph: {
			images: project.coverImage
				? [
						{
							url: `${process.env.NEXT_PUBLIC_APP_URL}/api/og?t=${project.name}&st=Author%20${project.author.name}&img=${project.coverImage}`,
						},
					]
				: undefined,
		},
	};

	const getPlatformIcon = (type: string) => platformOptions.find((opt) => opt.value === type)?.icon;
	const getPlatformLabel = (type: string) =>
		platformOptions.find((opt) => opt.value === type)?.label;

	const renderProjectLinks = (links: ProjectLink[]) => {
		const linkElements = (links || [])
			.sort((a, b) => (a.isPrimary ? -1 : 1))
			.map((link: ProjectLink) =>
				link.isPrimary ? (
					<Button
						key={link.platform}
						type="default"
						className={styles.projectLink}
						href={link.link}
						target="_blank"
					>
						<Flex align="center" gap={8}>
							{getPlatformIcon(link.platform)}
							<>Go to {getPlatformLabel(link.platform)}</>
						</Flex>
					</Button>
				) : (
					<Tooltip key={link.platform} title={`Go to ${getPlatformLabel(link.platform)}`}>
						<Button
							type="text"
							className={styles.projectLink}
							href={link.link}
							target="_blank"
							icon={getPlatformIcon(link.platform)}
						/>
					</Tooltip>
				),
			);
		return (
			<ConfigProvider theme={{ components: { Button: { controlHeight: 36, paddingInline: 16 } } }}>
				<Flex align="center" gap={16} style={{ margin: "16px 0 0" }}>
					{linkElements}
				</Flex>
			</ConfigProvider>
		);
	};

	const generalData = (
		<div className={styles.projectMeta}>
			<Descriptions size="small" layout={screens.md ? "horizontal" : "vertical"} column={1}>
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
				<Descriptions.Item label={t("page.project.visualStyle", "Visual Style")}>
					{project.visualStyle}
				</Descriptions.Item>
			</Descriptions>
		</div>
	);

	const pitchVideoOptions: Options = {
		playerVars: { disablekb: 1, autoplay: showPitchVideo ? 1 : 0 },
	};

	return (
		<PublicLayout
			title={project?.name}
			subTitle={t("Author") + " " + project.author.name}
			subLine={renderProjectLinks(project.links as any)}
			backgroundImage={project.coverImage || undefined}
			seo={seo as any}
		>
			<div className={styles.container}>
				<Row gutter={[32, 16]}>
					<Col xs={{ span: 24, order: 1 }} md={{ span: 12, order: 0 }} lg={{ span: 16, order: 0 }}>
						<Space direction="vertical" size={64} style={{ width: "100%" }}>
							<div className="project-description">
								<Title level={2}>{t("page.project.aboutGame", "About Game")}</Title>
								<Paragraph>
									<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>
										{project.description || ""}
									</ReactMarkdown>
								</Paragraph>
								{!!(project as any).workflow?.currentStep && (
									<Paragraph type="secondary">
										{t("page.project.developmentStage", "Development stage")}:{" "}
										{(project as any).workflow.currentStep.name}
									</Paragraph>
								)}
							</div>
							<ProjectVacancies teamId={(project as any).teamId} />
							<DevlogPosts projectId={project.id} />
						</Space>
					</Col>
					<Col xs={{ span: 24, order: 0 }} md={{ span: 12, order: 1 }} lg={{ span: 8, order: 1 }}>
						{!!project.coverImage && (
							<div className={styles.cover}>
								<Image src={project.coverImage} alt="cover" fill />
							</div>
						)}
						{generalData}
						{(project as any).author.profile.tgNickname ? (
							<Link
								href={`https://t.me/${(project as any).author.profile.tgNickname}`}
								target="_blank"
								style={{ display: "block", width: "fit-content" }}
							>
								<Button shape="round" type="dashed" className={styles.writeToAuthorButton}>
									<TbBrandTelegram size={16} />{" "}
									{t("page.project.contactTheAuthor", "Contact the author")}
								</Button>
							</Link>
						) : null}
						<div className="project-team">
							<TeamMembers teamId={(project as any).teamId} />
						</div>
					</Col>
				</Row>
			</div>
		</PublicLayout>
	);
}
