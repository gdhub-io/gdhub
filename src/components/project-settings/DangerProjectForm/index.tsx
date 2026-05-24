import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useTranslate } from "@tolgee/react";
import { Button, Card, Flex, Space, Spin, Typography } from "antd";
import { useState } from "react";
import { useCurrentProject } from "@/hooks/project";
import ArchiveProjectModal from "./ArchiveProjectModal";
import DeleteProjectModal from "./DeleteProjectModal";
import styles from "./style.module.scss";

const { Text } = Typography;

const DangerProjectForm = () => {
	const { t } = useTranslate();
	const { project, refetch, isLoading } = useCurrentProject();
	const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

	const isArchived = project?.status === prismaClient.ProjectStatus.Archived;

	const refreshProjectData = async () => {
		await refetch();
	};

	return (
		<Spin spinning={isLoading}>
			<Space orientation="vertical" size="large" className={styles.container}>
				<Text type="secondary">
					{t(
						"project.settings.danger.description",
						"Archive or permanently delete this project.",
					)}
				</Text>

				<Card variant="borderless">
					<Card.Meta
						title={
							<Flex justify="space-between" align="center">
								{isArchived
									? t(
											"project.settings.danger.restore.cardTitle",
											"Restore Project",
										)
									: t(
											"project.settings.danger.archive.cardTitle",
											"Archive Project",
										)}

								<Button
									type="primary"
									disabled={!project}
									onClick={() => setIsArchiveModalOpen(true)}
								>
									{isArchived
										? t("project.settings.danger.restore.button", "Restore")
										: t("project.settings.danger.archive.button", "Archive")}
								</Button>
							</Flex>
						}
						description={
							<Text>
								{isArchived
									? t(
											"project.settings.danger.restore.cardDescription",
											"Restore the project and return it to active circulation.",
										)
									: t(
											"project.settings.danger.archive.description",
											"Archive keeps the project data but moves the project out of active circulation.",
										)}
							</Text>
						}
					/>
				</Card>

				<Card variant="borderless">
					<Card.Meta
						title={
							<Flex justify="space-between" align="center">
								{t(
									"project.settings.danger.delete.cardTitle",
									"Delete Project",
								)}
								<Button
									type="primary"
									danger
									disabled={!project}
									onClick={() => setIsDeleteModalOpen(true)}
								>
									{t("project.settings.danger.delete.button", "Delete")}
								</Button>
							</Flex>
						}
						description={
							<Text>
								{t(
									"project.settings.danger.delete.description",
									"Delete permanently removes the project and related data when hard deletion is allowed.",
								)}
							</Text>
						}
					/>
				</Card>
			</Space>

			<ArchiveProjectModal
				open={isArchiveModalOpen}
				project={project}
				onClose={() => setIsArchiveModalOpen(false)}
				onStatusChanged={refreshProjectData}
			/>
			<DeleteProjectModal
				open={isDeleteModalOpen}
				project={project}
				onClose={() => setIsDeleteModalOpen(false)}
			/>
		</Spin>
	);
};

export default DangerProjectForm;
