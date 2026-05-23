"use client";

import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useTranslate } from "@tolgee/react";
import { ConfigProvider, Flex, Select, Typography } from "antd";
import { useMemo, useState } from "react";
import GameCardList from "@/components/GameCard/GameCardList";
import GameOnStoreCardList, {
	type GameOnStoreCardListItem,
} from "@/components/GameOnStoreCardList";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import styles from "./style.module.scss";

const { Paragraph } = Typography;

export type ProjectIncludeAll = prismaClient.Project & {
	author: prismaClient.User;
	workflow:
		| (prismaClient.ProjectWorkflow & {
				currentStep: {
					id: string;
					name: string;
					order: number;
				} | null;
				steps: prismaClient.ProjectWorkflowStep[];
		  })
		| null;
	lastPostAt: Date;
	firstPostAt: Date;
	applauseCount?: number;
	hasOpenPositions?: boolean;
};

export interface ProjectsPageProps {
	projects: ProjectIncludeAll[];
	publishedProjects: GameOnStoreCardListItem[];
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

					<div className={styles.storeProjectsSection}>
						<div className={styles.sectionHeader}>
							<Typography.Title level={3} className={styles.sectionTitle}>
								{t(
									"page.hub.projects.availableOnStores",
									"Available on Stores",
								)}
							</Typography.Title>
						</div>

						<GameOnStoreCardList projects={publishedProjects} />
					</div>

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

						<GameCardList games={filteredProjects} loading={false} />
					</div>
				</div>
			</div>
		</>
	);
}
