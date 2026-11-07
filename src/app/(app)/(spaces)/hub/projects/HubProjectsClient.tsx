"use client";

import { IconDeviceGamepad2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Col,
	ConfigProvider,
	Flex,
	Row,
	Select,
	Skeleton,
	Typography,
} from "antd";
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
import cardStyles from "@/components/project/cards/ProjectCard.module.scss";
import storeCardStyles from "@/components/project/cards/ProjectStoreCard.module.scss";
import { EmptyState, LoadError } from "@/components/ui";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import styles from "./style.module.scss";

/** A card shell from the real card's own styles, cover and text as placeholders. */
function CardSkeleton({ store = false }: { store?: boolean }) {
	const card = store ? storeCardStyles : cardStyles;
	const foot = (
		<div className={card.foot}>
			<SkeletonLine width={"35%"} height={14} />
			<Skeleton.Button active size="small" />
		</div>
	);
	// The store card keeps its foot inside the body, the plain card below it.
	return (
		<div className={card.card} aria-busy>
			<div className={card.cover}>
				<Skeleton.Node active className={styles.coverSkeleton} />
			</div>
			<div className={card.body}>
				<Flex vertical gap={6}>
					<SkeletonLine width={"40%"} height={14} />
					<SkeletonLine width={"75%"} height={24} />
					<SkeletonLine width={"100%"} height={14} />
				</Flex>
				{store && foot}
			</div>
			{!store && foot}
		</div>
	);
}

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
		isLoadingError: listFailed,
		refetch,
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

	const {
		data: publishedProjects,
		isLoading: isStoreQueryLoading,
		isLoadingError: storeFailed,
		refetch: refetchStore,
	} = useQuery({
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
	const isStoreLoading = isSessionLoading || isStoreQueryLoading;

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
				{!isListLoading && !isSuccess && !listFailed && (
					<Paragraph type="secondary">
						{t(
							"page.hub.projects.unavailable",
							"There are no projects available to view",
						)}
					</Paragraph>
				)}

				{(isStoreLoading || storeFailed || storeProjects.length > 0) && (
					<div className={styles.storeProjectsSection}>
						<div className={styles.sectionHeader}>
							<Typography.Title level={3} className={styles.sectionTitle}>
								{t(
									"page.hub.projects.availableOnStores",
									"Available on Stores",
								)}
							</Typography.Title>
						</div>

						{storeFailed && (
							<LoadError
								title={t(
									"page.hub.projects.store-error",
									"Projects on stores could not be loaded",
								)}
								onRetry={refetchStore}
							/>
						)}
						<Row gutter={[16, 16]}>
							{isStoreLoading &&
								[0, 1].map((index) => (
									<Col key={index} xs={24} md={12}>
										<CardSkeleton store />
									</Col>
								))}
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

					{isListLoading ? (
						<Row gutter={[16, 16]}>
							{[0, 1, 2, 3].map((index) => (
								<Col key={index} xs={24} sm={12} lg={8} xl={6}>
									<CardSkeleton />
								</Col>
							))}
						</Row>
					) : listFailed ? (
						<LoadError
							title={t(
								"page.hub.projects.error",
								"Projects could not be loaded",
							)}
							onRetry={refetch}
						/>
					) : filteredProjects.length > 0 ? (
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
