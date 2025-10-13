import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Col, Empty, Flex, Row, Space, Spin, Typography } from "antd";
import axios from "axios";
import type React from "react";
import { useState } from "react";
import GameCard from "../GameCard";
import CreateProjectModal from "../modals/CreateProjectModal";
import EmptyProjectsState from "./EmptyProjectsState";
import styles from "./styles.module.scss";

const { Title } = Typography;

const MyProjectList: React.FC = () => {
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
		return (
			<div className={styles.loadingContainer}>
				<Spin />
			</div>
		);
	}

	return (
		<div className={styles.userProjectsContainer}>
			<Flex justify="space-between" wrap>
				<Title level={2}>{t("page.hub.user-projects", "My Projects")}</Title>

				<Button type="primary" onClick={() => setOpenCreateProjectModal(true)}>
					<Space>{t("project.create", "Add Project")}</Space>
				</Button>
			</Flex>

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

			<Row gutter={[24, 24]} className={styles.projectsGrid}>
				{projects?.data.map((project: any) => (
					<Col key={project.id} xs={24} sm={12} md={8} lg={6} xl={6}>
						<GameCard
							id={project.id}
							title={project.name}
							genre={project.genre || undefined}
							platform={project.platform || undefined}
							coverImage={project.coverImage || undefined}
							slug={project.slug}
							workflowStage={project.workflow?.steps?.[0]?.name}
							authorName={project.author?.name}
							authorAvatar={project.author?.image}
							isUserProject={true}
						/>
					</Col>
				))}
			</Row>

			<CreateProjectModal
				open={openCreateProjectModal}
				onCancel={() => setOpenCreateProjectModal(false)}
			/>
		</div>
	);
};

export default MyProjectList;
