import { IoAdd } from "@react-icons/all-files/io5/IoAdd";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Col, Empty, Flex, Row, Spin, Typography } from "antd";
import axios from "axios";
import type React from "react";
import { useState } from "react";
import {
	getHubSectionShellClass,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import GameCard from "../GameCard";
import CreateProjectModal from "../modals/CreateProjectModal";
import EmptyProjectsState from "./EmptyProjectsState";
import styles from "./styles.module.scss";

const { Title } = Typography;

type UserProjectCard = {
	id: string;
	name: string;
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
	variant?: "default" | "hub";
	/** Strip outer frame — used inside hub `mainSectionsBundle` */
	bundleInset?: boolean;
};

const MyProjectList: React.FC<MyProjectListProps> = ({
	variant = "default",
	bundleInset = false,
}) => {
	const [openCreateProjectModal, setOpenCreateProjectModal] = useState(false);
	const { t } = useTranslate();

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
				<Button
					type="primary"
					className={styles.hubCreateBtn}
					icon={<IoAdd aria-hidden />}
					onClick={() => setOpenCreateProjectModal(true)}
				>
					{t("hub.new-project", "New Project")}
				</Button>
			</HubSectionHeader>
		) : (
			<Flex justify="space-between" wrap>
				<Title level={2}>{t("page.hub.user-projects", "My Projects")}</Title>

				<Button type="primary" onClick={() => setOpenCreateProjectModal(true)}>
					{t("project.create", "Add Project")}
				</Button>
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
				<Empty
					description={t(
						"page.hub.user-projects.load-error",
						"Failed to load user projects",
					)}
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
							isUserProject={true}
							variant={variant}
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
