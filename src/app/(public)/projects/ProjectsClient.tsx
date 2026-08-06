"use client";

import type {
	Project,
	ProjectWorkflow,
	ProjectWorkflowStep,
	User,
} from "@gdhub-io/gdhub-prisma";
import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Col, ConfigProvider, Flex, Row, Select, Typography } from "antd";
import { useMemo, useState } from "react";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import {
	ProjectCard,
	type ProjectCardTeam,
	ProjectStoreCard,
	type StorefrontLink,
} from "@/components/project/cards";
import { EmptyState } from "@/components/ui";
import styles from "./style.module.scss";

const { Paragraph } = Typography;

export type ProjectIncludeAll = Project & {
	author: User;
	workflow:
		| (ProjectWorkflow & {
				currentStep: {
					id: string;
					name: string;
					order: number;
				} | null;
				steps: ProjectWorkflowStep[];
		  })
		| null;
	lastPostAt: Date;
	firstPostAt: Date;
	applauseCount?: number;
	hasOpenPositions?: boolean;
	stage?: string | null;
	team?: ProjectCardTeam;
};

export type PublishedProject = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	genre: string | null;
	platform: string | null;
	coverImage: string | null;
	applauseCount?: number;
	storeLinks: StorefrontLink[];
	team?: ProjectCardTeam;
	author?: { name: string | null } | null;
	workflow: { currentStep: { name: string; order: number } };
};

export interface ProjectsPageProps {
	projects: ProjectIncludeAll[];
	publishedProjects: PublishedProject[];
}

export function ProjectsClient({
	projects,
	publishedProjects,
}: ProjectsPageProps) {
	const { t } = useTranslate();
	const [selectedStage, setSelectedStage] = useState<string>();

	const stageOptions = useMemo(() => {
		const uniqueStages = new Map<
			string,
			{ label: string; value: string; order: number }
		>();

		for (const project of projects) {
			const currentStep = project.workflow?.currentStep;
			if (!currentStep?.name) continue;

			if (!uniqueStages.has(currentStep.name)) {
				uniqueStages.set(currentStep.name, {
					label: currentStep.name,
					value: currentStep.name,
					order: currentStep.order,
				});
			}
		}

		return Array.from(uniqueStages.values())
			.sort((left, right) => left.order - right.order)
			.map(({ label, value }) => ({ label, value }));
	}, [projects]);

	const filteredProjects = useMemo(() => {
		if (!selectedStage) return projects;
		return projects.filter(
			(project) => project.workflow?.currentStep?.name === selectedStage,
		);
	}, [projects, selectedStage]);

	return (
		<>
			<PublicPageHeader
				title={t("page.projects.title", "Video Games")}
				subTitle={t(
					"page.projects.subtitle",
					"Projects developed independently by users and teams",
				)}
			/>
			<div className="layout-background">
				<div className={styles.container}>
					{!projects.length && (
						<Paragraph type="secondary">
							There are no projects available to view
						</Paragraph>
					)}

					{publishedProjects.length > 0 && (
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
								{publishedProjects.map((project) => (
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
								theme={{
									components: {
										Select: { controlHeight: 40 },
									},
								}}
							>
								<Select
									allowClear
									variant="filled"
									value={selectedStage}
									options={stageOptions}
									placeholder={t(
										"page.hub.projects.filterByStage",
										"Filter by stage",
									)}
									className={styles.filterSelect}
									onChange={(value) => setSelectedStage(value)}
								/>
							</ConfigProvider>
						</Flex>

						{filteredProjects.length > 0 ? (
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
		</>
	);
}
