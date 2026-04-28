import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Alert, Modal, message, Space, Typography } from "antd";
import axios from "axios";
import { getErrorMessage, type ProjectLifecycleModalProps } from "./shared";
import styles from "./style.module.scss";

const { Text } = Typography;

type ArchiveProjectModalProps = ProjectLifecycleModalProps & {
	onStatusChanged: () => Promise<void>;
};

const ArchiveProjectModal = ({
	open,
	project,
	onClose,
	onStatusChanged,
}: ArchiveProjectModalProps) => {
	const { t } = useTranslate();
	const isArchived = project?.status === prismaClient.ProjectStatus.Archived;

	const { mutateAsync: archiveProject, isPending: isArchivingProject } =
		useMutation({
			mutationFn: () =>
				axios
					.post<prismaClient.Project>("/api/user/project/lifecycle", {
						id: project?.id,
						action: "archive",
					})
					.then((res) => res.data),
		});

	const { mutateAsync: restoreProject, isPending: isRestoringProject } =
		useMutation({
			mutationFn: () =>
				axios
					.post<prismaClient.Project>("/api/user/project/lifecycle", {
						id: project?.id,
						action: "restore",
					})
					.then((res) => res.data),
		});

	const handleProjectStatusChange = async () => {
		if (!project) return;

		try {
			if (isArchived) {
				await restoreProject();
				message.success(
					t(
						"project.settings.danger.restore.success",
						"Project restored successfully",
					),
				);
			} else {
				await archiveProject();
				message.success(
					t(
						"project.settings.danger.archive.success",
						"Project archived successfully",
					),
				);
			}

			onClose();
			await onStatusChanged();
		} catch (error) {
			message.error(getErrorMessage(error));
		}
	};

	const modalTitle = isArchived
		? t("project.settings.danger.restore.title", "Restore Project")
		: t("project.settings.danger.archive.title", "Archive Project");
	const okText = isArchived
		? t("project.settings.danger.restore.confirm", "Restore")
		: t("project.settings.danger.archive.confirm", "Archive");
	const description = isArchived
		? t(
				"project.settings.danger.restore.description",
				"Restore this project and return it to active circulation.",
			)
		: t(
				"project.settings.danger.archive.previewTitle",
				"Project data will stay in the database, but the project will be moved out of active circulation.",
			);
	const alertMessage = isArchived
		? t(
				"project.settings.danger.restore.modalMessage",
				"Restoring will make the project active again.",
			)
		: t(
				"project.settings.danger.archive.modalMessage",
				"Archiving will keep this data in the database.",
			);

	return (
		<Modal
			centered
			open={open}
			title={modalTitle}
			okText={okText}
			confirmLoading={isArchivingProject || isRestoringProject}
			onOk={handleProjectStatusChange}
			onCancel={onClose}
			cancelText={t("project.settings.danger.cancel", "Cancel")}
			width={560}
		>
			<Space direction="vertical" size="middle" className={styles.modalBody}>
				<Text>{description}</Text>

				<Alert type="warning" showIcon message={alertMessage} />
			</Space>
		</Modal>
	);
};

export default ArchiveProjectModal;
