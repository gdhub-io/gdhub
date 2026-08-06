"use client";

import type {
	Profile,
	Project,
	ProjectWorkflowStep,
	User,
} from "@gdhub-io/gdhub-prisma";
import {
	IconBrandTelegram,
	IconDownload,
	IconQrcode,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	ConfigProvider,
	Flex,
	Grid,
	Modal,
	QRCode,
	Tooltip,
	Typography,
} from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import type { Pluggable } from "unified";
import GDHubLogoImg from "@/assets/images/gdhub-short-logo.png";
import { ApplauseButton } from "@/components/ApplauseButton";
import DevlogPosts from "@/components/DevlogPosts";
import {
	getHubSectionShellClass,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import ProjectVacancies from "@/components/ProjectVacancies";
import { ProjectAuthorCard } from "@/components/project/ProjectAuthorCard";
import { ProjectGameDetails } from "@/components/project/ProjectGameDetails";
import { ProjectVideoCover } from "@/components/project/ProjectVideoCover";
import TeamMembers from "@/components/TeamMembers";
import { platformOptions } from "@/helpers/react-content";
import { useScrollAwareSticky } from "@/hooks/useScrollAwareSticky";
import type { ProjectLink } from "@/types/project";
import styles from "./style.module.scss";

const { Text } = Typography;

export type ProjectPageParams = {
	project: Omit<
		Project,
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
			name: User["name"];
			image: User["image"];
			profile: {
				name: Profile["name"];
				tgNickname: Profile["tgNickname"];
				motivation: Profile["motivation"];
			} | null;
			specialities: {
				name: string;
				specialization: string;
				level: string;
			}[];
		};
		workflow: {
			currentStep: { name: ProjectWorkflowStep["name"] } | null;
		} | null;
		team: { id: string } | null;
	};
	projectApplauseCount: number;
	seo?: { title?: string | null; description?: string | null; image?: string };
};

export function ProjectPageClient({
	project,
	projectApplauseCount,
	seo,
}: ProjectPageParams) {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const pathname = usePathname();
	const screens = Grid.useBreakpoint();
	const [isQrModalOpen, setIsQrModalOpen] = useState(false);

	// The sidebar rides with the page and pins where the reading direction wants
	// it — the same behaviour as the hub, from the same hook.
	const sidebarRef = useRef<HTMLElement>(null);
	useScrollAwareSticky(sidebarRef, { offset: 36, enabled: !!screens.lg });

	const getCurrentPageUrl = () => {
		if (typeof window !== "undefined") {
			return window.location.href;
		}
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		return `${baseUrl}${pathname ?? ""}`;
	};

	if (!project) return null;

	const getPlatformIcon = (type: string) => {
		const option = platformOptions.find((opt) => opt.value === type);
		return option?.icon;
	};

	const getPlatformLabel = (type: string) => {
		const option = platformOptions.find((opt) => opt.value === type);
		return option?.label;
	};

	const markdownRehypePlugins = [rehypeRaw] as Pluggable[];

	const renderProjectLinks = (links: ProjectLink[]) => {
		const linkElements = links
			.sort((a, _b) => (a.isPrimary ? -1 : 1))
			.map((link: ProjectLink) => {
				return link.isPrimary ? (
					<Button
						key={link.platform}
						type="default"
						className={styles.storeButton}
						href={link.link}
						target="_blank"
					>
						<Flex align="center" gap={8}>
							{getPlatformIcon(link.platform)}
							{t("page.project.goToStore", "Go to {store}", {
								store: getPlatformLabel(link.platform) ?? "",
							})}
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

					<ApplauseButton
						subject={{ kind: "project", id: project.id }}
						count={projectApplauseCount}
						size="large"
						className={styles.projectApplause}
					/>
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
				sticky
				title={project?.name}
				subTitle={
					<span className={styles.metaRow}>
						<span>
							{t("Author")} {project.author.name}
						</span>
						{!!project.workflow?.currentStep && (
							<>
								<span className={styles.metaSep} />
								<span className={styles.stageChip}>
									<span className={styles.stageDot} />
									{project.workflow.currentStep.name}
								</span>
							</>
						)}
					</span>
				}
				subLine={renderProjectLinks(project.links as ProjectLink[])}
				backgroundImage={project.coverImage || undefined}
			/>

			<div className="layout-background">
				<div className={styles.container}>
					<div className={styles.pageGrid}>
						<main className={styles.mainArea}>
							{/* No pitch written yet is not a section with nothing in it. */}
							{!!project.description?.trim() && (
								<section className={getHubSectionShellClass("standalone")}>
									<HubSectionHeader
										className={styles.cardHeader}
										title={t("page.project.description", "Description")}
									/>
									<HubSectionBody>
										<div className={styles.descriptionBody}>
											<ReactMarkdown rehypePlugins={markdownRehypePlugins}>
												{project.description}
											</ReactMarkdown>
										</div>
									</HubSectionBody>
								</section>
							)}

							{project.team?.id && (
								<ProjectVacancies teamId={project.team.id} />
							)}

							<DevlogPosts
								projectId={project.id}
								variant="hub"
								title={t("page.hub.project-updates", "Project updates")}
							/>
						</main>

						<aside className={styles.asideArea} ref={sidebarRef}>
							<ProjectVideoCover
								coverImage={project.coverImage}
								videoLink={project.videoLink}
								alt="cover"
							/>

							<ProjectGameDetails project={project} />

							<ProjectAuthorCard author={project.author} />

							{session && project.author.profile?.tgNickname ? (
								<Link
									href={`https://t.me/${project.author.profile.tgNickname}`}
									target="_blank"
									className={styles.writeToAuthorLink}
								>
									<Button
										shape="round"
										type="dashed"
										className={styles.writeToAuthorButton}
									>
										<IconBrandTelegram size={16} />{" "}
										{t("page.project.contactTheAuthor", "Contact the author")}
									</Button>
								</Link>
							) : null}

							{project.team?.id && (
								<TeamMembers teamId={project.team.id} variant="hubSidebar" />
							)}
						</aside>
					</div>
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
