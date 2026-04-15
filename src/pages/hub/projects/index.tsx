"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { ConfigProvider, Flex, Select, Typography } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useState } from "react";
import GameOnStoreCardList from "@/components/GameOnStoreCardList";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const GameCardList = dynamic(
	() => import("@/components/GameCard/GameCardList"),
	{ ssr: false },
);

const { Paragraph } = Typography;

/**
 * Projects page component that displays a list of indie game projects
 *
 * @returns {JSX.Element} Rendered component
 */
const ProjectsPage: NextPageWithLayout = () => {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const [selectedStage, setSelectedStage] = useState<string>();

	const {
		data: projects,
		isSuccess,
		isLoading,
	} = useQuery({
		queryKey: ["projects", selectedStage],
		queryFn: () =>
			axios.get("/api/projects", {
				params: selectedStage ? { stage: selectedStage } : undefined,
			}),
		enabled: !!session?.user,
	});

	const { data: projectStages } = useQuery({
		queryKey: ["projects", "stages"],
		queryFn: () => axios.get("/api/projects/stages"),
		enabled: !!session?.user,
	});

	const { data: publishedProjects } = useQuery({
		queryKey: ["projects", "published"],
		queryFn: () => axios.get("/api/projects/published"),
		enabled: !!session?.user,
	});

	return (
		<ProtectedLayout
			title={t("page.hab.projects.title", "Indie Game Projects")}
			subTitle={t(
				"page.hab.projects.subtitle",
				"Projects developed independently by users",
			)}
		>
			<div className={styles.container}>
				{!isSuccess && !isLoading && (
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

					<GameOnStoreCardList projects={publishedProjects?.data || []} />
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

					<GameCardList games={projects?.data || []} loading={isLoading} />
				</div>
			</div>
		</ProtectedLayout>
	);
};

export default ProjectsPage;
