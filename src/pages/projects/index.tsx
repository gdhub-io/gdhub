import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useTranslate } from "@tolgee/react";
import { ConfigProvider, Flex, Select, Typography } from "antd";
import type { GetServerSidePropsContext } from "next";
import { useMemo, useState } from "react";
import GameCardList from "@/components/GameCard/GameCardList";
import GameOnStoreCardList, {
	type GameOnStoreCardListItem,
} from "@/components/GameOnStoreCardList";
import { PublicLayout } from "@/layouts/PublicLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import {
	getPublishedStoreProjects,
	getWorkedProjects,
} from "@/services/prisma/queries";
import styles from "./style.module.scss";

const { Paragraph } = Typography;

type ProjectIncludeAll = prismaClient.Project & {
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

type ProjectsPageParams = {
	projects: ProjectIncludeAll[];
	publishedProjects: GameOnStoreCardListItem[];
};

const ProjectsPage: NextPageWithLayout<ProjectsPageParams> = ({
	projects,
	publishedProjects,
}) => {
	const { t } = useTranslate();
	const [selectedStage, setSelectedStage] = useState<string>();

	const stageOptions = useMemo(() => {
		const uniqueStages = new Map<
			string,
			{ label: string; value: string; order: number }
		>();

		for (const project of projects) {
			const currentStep = project.workflow?.currentStep;

			if (!currentStep?.name) {
				continue;
			}

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
		if (!selectedStage) {
			return projects;
		}

		return projects.filter(
			(project) => project.workflow?.currentStep?.name === selectedStage,
		);
	}, [projects, selectedStage]);

	return (
		<PublicLayout
			title={t("page.projects.title", "Video Games")}
			subTitle={t(
				"page.projects.subtitle",
				"Projects developed independently by users and teams",
			)}
			seo={{
				description: t(
					"Indie games that are developed by platform users and teams",
				),
			}}
		>
			<div className={styles.container}>
				{!projects.length && (
					<Paragraph type="secondary">
						There are no projects available to view
					</Paragraph>
				)}

				<div className={styles.storeProjectsSection}>
					<div className={styles.sectionHeader}>
						<Typography.Title level={3} className={styles.sectionTitle}>
							{t("page.hub.projects.availableOnStores", "Available on Stores")}
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
		</PublicLayout>
	);
};

export const getStaticProps = async (_context: GetServerSidePropsContext) => {
	const projects = await getWorkedProjects();
	const publishedProjects = await getPublishedStoreProjects();

	return {
		props: {
			projects: projects.map((p: ProjectIncludeAll) => {
				return {
					...p,
					createdAt: p.createdAt?.toISOString() || null,
					updatedAt: p.updatedAt?.toISOString() || null,
					startedAt: p.startedAt?.toISOString() || null,
					finishedAt: p.finishedAt?.toISOString() || null,
					lastPostAt: p.lastPostAt?.toISOString() || null,
					firstPostAt: p.firstPostAt?.toISOString() || null,
					author: {
						...p.author,
						createdAt: p.author.createdAt?.toISOString() || null,
						updatedAt: p.author.updatedAt?.toISOString() || null,
					},
					workflow: p.workflow || null,
				};
			}),
			publishedProjects,
		},
		revalidate: 60,
	};
};

export default ProjectsPage;
