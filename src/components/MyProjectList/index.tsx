import type { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import {
	IconAlertTriangle,
	IconBriefcase,
	IconChevronRight,
	IconDeviceGamepad2,
	IconPlus,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Col, Flex, Row, Space, Spin, Typography } from "antd";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type React from "react";
import { useState } from "react";
import {
	getHubSectionShellClass,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import { HubSectionRow } from "@/components/hub/HubSectionRow";
import { EmptyState } from "@/components/ui";
import GameCard from "../GameCard";
import CreateProjectModal from "../modals/CreateProjectModal";
import EmptyProjectsState from "./EmptyProjectsState";
import sidebarStyles from "./sidebar.module.scss";
import styles from "./styles.module.scss";

const { Title } = Typography;

type UserProjectCard = {
	authorId?: string;
	id: string;
	name: string;
	status: ProjectStatus;
	genre?: string | null;
	platform?: string | null;
	coverImage?: string | null;
	slug: string;
	workflow?: {
		steps?: { name?: string | null }[];
	} | null;
	author?: {
		name?: string | null;
		image?: string | null;
	} | null;
};

type MyProjectListProps = {
	variant?: "default" | "hub" | "hubSidebar";
	/** Strip outer frame — used inside hub `mainSectionsBundle` */
	bundleInset?: boolean;
};

const MyProjectList: React.FC<MyProjectListProps> = ({
	variant = "default",
	bundleInset = false,
}) => {
	const [openCreateProjectModal, setOpenCreateProjectModal] = useState(false);
	const { t } = useTranslate();
	const currentUserId = useSession().data?.user?.id;

	const authorLine = (project: UserProjectCard) => {
		if (currentUserId && project.authorId === currentUserId)
			return t("hub.my-projects.author-me", "Me");
		return project.author?.name ?? null;
	};

	const {
		data: projects,
		isSuccess,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["userProjects"],
		queryFn: () => axios.get("/api/user/projects"),
		refetchOnWindowFocus: false,
	});

	if (isLoading) {
		const loading = (
			<div className={styles.loadingContainer}>
				<Spin />
			</div>
		);
		if (variant === "hub") {
			const shell = getHubSectionShellClass(bundleInset ? "inset" : "main");
			return (
				<div
					className={`${styles.userProjectsContainer} ${shell} ${styles.hubSectionWrap}`}
				>
					<HubSectionHeader
						title={t("page.hub.user-projects", "My projects")}
					/>
					<HubSectionBody>{loading}</HubSectionBody>
				</div>
			);
		}
		return loading;
	}

	const headerRow =
		variant === "hub" ? (
			<HubSectionHeader
				title={t("page.hub.user-projects", "My projects")}
				className={styles.hubSectionHeader}
			>
				<Space>
					<Button
						href="/hub/jobs"
						icon={<IconBriefcase size={16} aria-hidden />}
					>
						{t("project.openPositions", "Open Positions")}
					</Button>
					<Button
						type="primary"
						onClick={() => setOpenCreateProjectModal(true)}
					>
						{t("hub.new-project", "New project")}
					</Button>
				</Space>
			</HubSectionHeader>
		) : (
			<Flex justify="space-between" wrap>
				<Title level={2}>{t("page.hub.user-projects", "My Projects")}</Title>

				<Space>
					<Button
						href="/hub/jobs"
						icon={<IconBriefcase size={16} aria-hidden />}
					>
						{t("project.openPositions", "Open Positions")}
					</Button>
					<Button
						type="primary"
						onClick={() => setOpenCreateProjectModal(true)}
					>
						{t("project.create", "Add Project")}
					</Button>
				</Space>
			</Flex>
		);

	const gridGutter: [number, number] = variant === "hub" ? [12, 12] : [24, 24];
	const colSpan =
		variant === "hub"
			? { xs: 24, sm: 12, md: 12, lg: 12, xl: 12 }
			: { xs: 24, sm: 12, md: 12, lg: 12, xl: 12 };

	const inner = (
		<>
			{variant === "default" ? headerRow : null}

			{!isSuccess || !projects?.data || projects.data.length === 0 ? (
				<EmptyProjectsState
					onCreateProject={() => setOpenCreateProjectModal(true)}
				/>
			) : undefined}

			{error ? (
				<EmptyState
					icon={IconAlertTriangle}
					title={t(
						"page.hub.user-projects.load-error",
						"Failed to load user projects",
					)}
					description={t(
						"page.hub.user-projects.load-error-hint",
						"Reload the page — if it keeps failing, the service may be down.",
					)}
					tint="var(--gd-danger-tint)"
					ink="var(--gd-danger-on-tint)"
				/>
			) : undefined}

			<Row gutter={gridGutter} className={styles.projectsGrid}>
				{projects?.data.map((project: UserProjectCard) => (
					<Col key={project.id} {...colSpan}>
						<GameCard
							id={project.id}
							title={project.name}
							genre={project.genre || undefined}
							platform={project.platform || undefined}
							coverImage={project.coverImage || undefined}
							slug={project.slug}
							workflowStage={project.workflow?.steps?.[0]?.name ?? undefined}
							authorName={project.author?.name ?? undefined}
							authorAvatar={project.author?.image ?? undefined}
							status={project.status ?? undefined}
							isUserProject={true}
							variant={variant === "hub" ? "hub" : "default"}
						/>
					</Col>
				))}
			</Row>

			<CreateProjectModal
				open={openCreateProjectModal}
				onCancel={() => setOpenCreateProjectModal(false)}
			/>
		</>
	);

	if (variant === "hubSidebar") {
		const rows = projects?.data ?? [];
		return (
			<section className={getHubSectionShellClass("sidebar")}>
				<HubSectionHeader title={t("page.hub.user-projects", "My projects")}>
					<Button
						size="small"
						type="primary"
						onClick={() => setOpenCreateProjectModal(true)}
					>
						{t("hub.new-project", "New project")}
					</Button>
				</HubSectionHeader>

				{rows.length ? (
					<HubSectionBody flush>
						<div className={sidebarStyles.list}>
							{rows.map((project: UserProjectCard) => (
								<HubSectionRow
									key={project.id}
									href={`/hub/projects/${project.slug}`}
									title={project.name}
									subtitle={authorLine(project)}
									media={
										<span
											className={sidebarStyles.cover}
											style={
												project.coverImage
													? { backgroundImage: `url(${project.coverImage})` }
													: undefined
											}
											aria-hidden
										/>
									}
								/>
							))}
						</div>
					</HubSectionBody>
				) : (
					<HubSectionBody className={sidebarStyles.empty}>
						<EmptyState
							size="compact"
							icon={IconDeviceGamepad2}
							title={t("hub.my-projects.empty", "No projects yet")}
							description={t(
								"hub.my-projects.empty-hint",
								"Start one and assemble the team it needs.",
							)}
						/>
					</HubSectionBody>
				)}

				<CreateProjectModal
					open={openCreateProjectModal}
					onCancel={() => setOpenCreateProjectModal(false)}
				/>
			</section>
		);
	}

	if (variant === "hub") {
		const shell = getHubSectionShellClass(bundleInset ? "inset" : "main");
		return (
			<div
				className={`${styles.userProjectsContainer} ${shell} ${styles.hubSectionWrap}`}
			>
				{headerRow}
				<HubSectionBody>{inner}</HubSectionBody>
			</div>
		);
	}

	return <div className={styles.userProjectsContainer}>{inner}</div>;
};

export default MyProjectList;
