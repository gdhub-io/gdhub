"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { ConfigProvider, Flex, Select, Typography } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import GameOnStoreCardList from "@/components/GameOnStoreCardList";
import styles from "@/pages/hub/projects/style.module.scss";

const ProtectedLayout = dynamic(
	() => import("@/layouts/ProtectedLayout").then((m) => m.ProtectedLayout),
	{ ssr: false },
);
const GameCardList = dynamic(
	() => import("@/components/GameCard/GameCardList"),
	{ ssr: false },
);

const { Paragraph } = Typography;

export default function HubProjectsPage() {
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
		queryFn: () => axios.get("/api/projects"),
		enabled: isAuthenticated,
	});

	const { data: projectStages } = useQuery({
		queryKey: ["projects", "stages"],
		queryFn: () => axios.get("/api/projects/stages"),
		enabled: isAuthenticated,
	});

	const { data: publishedProjects, isLoading: isPublishedProjectsLoading } =
		useQuery({
			queryKey: ["projects", "published"],
			queryFn: () => axios.get("/api/projects/published"),
			enabled: isAuthenticated,
		});

	const filteredProjects = useMemo(() => {
		const items = projects?.data || [];
		if (!selectedStage) return items;
		return items.filter(
			(project: {
				workflow?: { currentStep?: { name?: string } | null } | null;
			}) => project.workflow?.currentStep?.name === selectedStage,
		);
	}, [projects?.data, selectedStage]);

	return (
		<ProtectedLayout
			title={t("page.hub.projects.title", "Indie Game Projects")}
			subTitle={t(
				"page.hub.projects.subtitle",
				"Projects developed independently by users",
			)}
		>
			<div className={styles.container}>
				{!isSessionLoading && !isLoading && !isSuccess && (
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

					<GameOnStoreCardList
						projects={publishedProjects?.data || []}
						loading={isSessionLoading || isPublishedProjectsLoading}
					/>
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

					<GameCardList
						games={filteredProjects}
						loading={isSessionLoading || isLoading}
					/>
				</div>
			</div>
		</ProtectedLayout>
	);
}
