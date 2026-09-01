"use client";

import {
	IconClock,
	IconContract,
	IconMessageCircle,
	IconWorld,
	IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Modal, Skeleton, Tabs, Tooltip, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { platformOptions } from "@/helpers/react-content";
import styles from "./style.module.scss";
import {
	ActivitiesTab,
	FilesTab,
	OverviewTab,
	ReviewsTab,
	TeamTab,
} from "./tabs";
import type { ProjectCardOverview } from "./types";

const { Text, Title } = Typography;

/**
 * The two tabs that cost something to load: the roadmap chart and Observable
 * Plot / d3. A scout who reads Overview and closes the card pays for neither.
 */
const tabSkeleton = () => <Skeleton active paragraph={{ rows: 6 }} />;

const WorkflowTab = dynamic(
	() => import("./tabs/WorkflowTab").then((module) => module.WorkflowTab),
	{ ssr: false, loading: tabSkeleton },
);

const InvestmentTab = dynamic(
	() => import("./tabs/InvestmentTab").then((module) => module.InvestmentTab),
	{ ssr: false, loading: tabSkeleton },
);

/** The project as a scout reads it, without leaving the games table. */
export function ProjectCardModal({
	projectId,
	onClose,
}: {
	projectId: string | null;
	onClose: () => void;
}) {
	const { t } = useTranslate();
	const [tab, setTab] = useState("overview");

	// A card opened from the table always opens on Overview, whatever tab the
	// previous one was left on.
	useEffect(() => setTab("overview"), [projectId]);

	const { data: project, isLoading } = useQuery<ProjectCardOverview>({
		enabled: !!projectId,
		queryKey: ["scout", "games", projectId],
		queryFn: () =>
			axios.get(`/api/scout/games/${projectId}`).then((res) => res.data),
	});

	// Seven items with seven `t()` calls, rebuilt on every keystroke of tab
	// state otherwise — and on the loading render, where they are thrown away.
	const tabs = useMemo(
		() =>
			project
				? [
						{
							key: "overview",
							label: t("scout.card.tab.overview", "Overview"),
							children: <OverviewTab project={project} onOpenTab={setTab} />,
						},
						{
							key: "team",
							label: t("scout.card.tab.team", "Team"),
							children: <TeamTab projectId={project.id} />,
						},
						{
							key: "files",
							label: t("scout.card.tab.files", "Files"),
							children: <FilesTab projectId={project.id} />,
						},
						{
							key: "activities",
							label: t("scout.card.tab.activities", "Activities"),
							children: <ActivitiesTab projectId={project.id} />,
						},
						{
							key: "workflow",
							label: t("scout.card.tab.workflow", "Workflow"),
							children: (
								<WorkflowTab
									projectId={project.id}
									startedAt={project.startedAt}
								/>
							),
						},
						{
							key: "reviews",
							label: t("scout.card.tab.reviews", "Reviews"),
							children: <ReviewsTab projectId={project.id} />,
						},
						{
							key: "investment",
							label: t("scout.card.tab.investment", "Investment"),
							children: <InvestmentTab projectId={project.id} />,
						},
					]
				: [],
		[project, t],
	);

	// No "updated" here: the footer already carries it, and repeating it puts
	// the same sentence twice on one card.
	const meta = project
		? [project.details.genre, project.details.platform]
				.filter(Boolean)
				.join(" · ")
		: "";

	return (
		<Modal
			open={!!projectId}
			onCancel={onClose}
			footer={null}
			closable={false}
			width={960}
			centered
			className={styles.modal}
			classNames={{ body: styles.body }}
			destroyOnHidden
		>
			{isLoading || !project ? (
				<div className={styles.loading}>
					<Skeleton active paragraph={{ rows: 8 }} />
				</div>
			) : (
				<>
					<header className={styles.header}>
						{project.coverImage && (
							<AppImage
								className={styles.cover}
								src={project.coverImage}
								alt=""
								fill
								sizes="960px"
							/>
						)}
						{/* Over artwork of unknown brightness: the top strip carries the
						    eyebrow and the chips, the bottom one the title band. */}
						<div className={styles.scrim} />
						<div className={styles.scrimBottom} />

						<Flex
							justify="space-between"
							align="start"
							className={styles.headerTop}
						>
							<Text className={styles.kind}>
								{t("scout.card.kind", "Project card")}
							</Text>
							<Flex gap={8} align="center">
								{/* The chips are the project's own links, each wearing its
								    platform's own mark — a row of identical chain icons
								    tells a scout nothing about where they lead. */}
								{project.links
									?.filter((link) => link.link)
									.slice(0, 3)
									.map((link) => {
										const platform = platformOptions.find(
											(option) => option.value === link.platform,
										);

										return (
											<Tooltip
												key={link.link}
												title={platform?.label ?? link.platform}
											>
												<Button
													className={styles.headerButton}
													icon={platform?.icon ?? <IconWorld size={16} />}
													href={link.link}
													target="_blank"
												/>
											</Tooltip>
										);
									})}
								<Button
									className={styles.close}
									icon={<IconX size={16} />}
									onClick={onClose}
									aria-label={t("common.close", "Close")}
								/>
							</Flex>
						</Flex>

						<Flex
							justify="space-between"
							align="end"
							gap={16}
							className={styles.headerBottom}
						>
							<Flex vertical gap={6} className={styles.titleWrap}>
								<Title level={2} className={styles.title}>
									{project.name}
								</Title>
								<Text className={styles.meta}>{meta}</Text>
							</Flex>

							<Flex gap={10} align="center">
								<Button
									className={styles.headerAction}
									icon={<IconMessageCircle size={15} />}
									href={`/hub/members/${project.author.id}`}
								>
									{t("scout.card.message", "Message author")}
								</Button>
								{/* Deals are designed and not built; a button that looks
								    live and does nothing is worse than one that says so. */}
								<Tooltip title={t("scout.menu.planned", "Planned")}>
									<span>
										<Button
											type="primary"
											disabled
											className={styles.headerOffer}
											icon={<IconContract size={16} />}
										>
											{t("scout.card.offer", "Make an offer")}
										</Button>
									</span>
								</Tooltip>
							</Flex>
						</Flex>
					</header>

					<Tabs
						items={tabs}
						activeKey={tab}
						onChange={setTab}
						className={styles.tabs}
					/>

					<footer className={styles.footer}>
						<Flex align="center" gap={6}>
							<IconClock size={14} />
							<span>
								{t("scout.card.updated", "Updated {when}", {
									when: dayjs(project.updatedAt).fromNow(),
								})}
							</span>
						</Flex>
					</footer>
				</>
			)}
		</Modal>
	);
}
