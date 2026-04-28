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
				"The project will be returned to the active list with all its data intact.",
			)
		: t(
				"project.settings.danger.archive.previewTitle",
				"The project will be removed from the active list, but all data will be safely preserved. You can restore the project at any time.",
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
			</Space>
		</Modal>
	);
};

export default ArchiveProjectModal;
