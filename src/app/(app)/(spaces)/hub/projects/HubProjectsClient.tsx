"use client";

import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Col, ConfigProvider, Flex, Row, Select, Typography } from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import {
	ProjectCard,
	type ProjectCardTeam,
	ProjectStoreCard,
	type StorefrontLink,
} from "@/components/project/cards";
import { EmptyState } from "@/components/ui";
import styles from "./style.module.scss";

const { Paragraph } = Typography;

type ProjectListItem = {
	id: string;
	slug: string;
	name: string;
	description: string | null;
	genre: string | null;
	platform: string | null;
	coverImage: string | null;
	applauseCount?: number;
	hasOpenPositions?: boolean;
	stage?: string | null;
	team?: ProjectCardTeam;
	author?: { name: string | null } | null;
	workflow?: { currentStep?: { name?: string } | null } | null;
};

type StoreProjectListItem = ProjectListItem & {
	storeLinks: StorefrontLink[];
	workflow: { currentStep: { name: string; order: number } };
};

export default function HubProjectsClient() {
	const { t } = useTranslate();
	const { status } = useSession();
	const [selectedStage, setSelectedStage] = useState<string>();

	const isAuthenticated = status === "authenticated";
	const isSessionLoading = status === "loading";

	const {
		data: projects,
		isSuccess,
		isLoading,
	} = useQuery({
		queryKey: ["projects"],
		queryFn: () => axios.get<ProjectListItem[]>("/api/projects"),
		enabled: isAuthenticated,
	});

	const { data: projectStages } = useQuery({
		queryKey: ["projects", "stages"],
		queryFn: () => axios.get("/api/projects/stages"),
		enabled: isAuthenticated,
	});

	const { data: publishedProjects } = useQuery({
		queryKey: ["projects", "published"],
		queryFn: () => axios.get<StoreProjectListItem[]>("/api/projects/published"),
		enabled: isAuthenticated,
	});

	const filteredProjects = useMemo(() => {
		const items = projects?.data || [];
		if (!selectedStage) return items;
		return items.filter(
			(project) => project.workflow?.currentStep?.name === selectedStage,
		);
	}, [projects?.data, selectedStage]);

	const storeProjects = publishedProjects?.data ?? [];
	const isListLoading = isSessionLoading || isLoading;

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("page.hub.projects.title", "Indie Game Projects")}
				subTitle={t(
					"page.hub.projects.subtitle",
					"Projects developed independently by users",
				)}
			/>
			<div className={styles.container}>
				{!isSessionLoading && !isLoading && !isSuccess && (
					<Paragraph type="secondary">
						{t(
							"page.hub.projects.unavailable",
							"There are no projects available to view",
						)}
					</Paragraph>
				)}

				{storeProjects.length > 0 && (
					<div className={styles.storeProjectsSection}>
						<div className={styles.sectionHeader}>
							<Typography.Title level={3} className={styles.sectionTitle}>
								{t(
									"page.hub.projects.availableOnStores",
									"Available on Stores",
								)}
							</Typography.Title>
						</div>

						<Row gutter={[16, 16]}>
							{storeProjects.map((project) => (
								<Col key={project.id} xs={24} md={12}>
									<ProjectStoreCard
										projectId={project.id}
										slug={project.slug}
										name={project.name}
										description={project.description}
										genre={project.genre}
										platform={project.platform}
										coverImage={project.coverImage}
										stage={project.workflow?.currentStep?.name}
										applauseCount={project.applauseCount}
										storeLinks={project.storeLinks}
										team={project.team}
										authorName={project.author?.name}
									/>
								</Col>
							))}
						</Row>
					</div>
				)}

				<div className={styles.projectsSection}>
					<Flex
						align="center"
						justify="space-between"
						gap={16}
						wrap
						className={styles.sectionHeader}
					>
						<Typography.Title level={3} className={styles.sectionTitle}>
							{t("page.hub.projects.allProjects", "All Projects")}
						</Typography.Title>

						<ConfigProvider
							theme={{ components: { Select: { controlHeight: 40 } } }}
						>
							<Select
								allowClear
								variant="filled"
								value={selectedStage}
								options={projectStages?.data || []}
								placeholder={t(
									"page.hub.projects.filterByStage",
									"Filter by stage",
								)}
								className={styles.filterSelect}
								onChange={(value) => setSelectedStage(value)}
							/>
						</ConfigProvider>
					</Flex>

					{isListLoading ? null : filteredProjects.length > 0 ? (
						<Row gutter={[16, 16]}>
							{filteredProjects.map((project) => (
								<Col key={project.id} xs={24} sm={12} lg={8} xl={6}>
									<ProjectCard
										projectId={project.id}
										slug={project.slug}
										name={project.name}
										description={project.description}
										genre={project.genre}
										platform={project.platform}
										coverImage={project.coverImage}
										stage={project.stage}
										hasOpenPositions={project.hasOpenPositions}
										applauseCount={project.applauseCount}
										team={project.team}
										authorName={project.author?.name}
									/>
								</Col>
							))}
						</Row>
					) : (
						<EmptyState
							icon={IconDeviceGamepad2}
							title={t("page.hub.projects.emptyTitle", "No projects found")}
							description={t(
								"page.hub.projects.emptyDescription",
								"Projects matching your filters will appear here.",
							)}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
