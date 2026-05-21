import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IconExclamationCircle } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	Form,
	Input,
	Modal,
	message,
	Space,
	Spin,
	Typography,
} from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	getErrorMessage,
	getProjectDeletionPreview,
	type ProjectLifecycleModalProps,
	renderImpactList,
} from "./shared";
import styles from "./style.module.scss";

const { Text } = Typography;

const DeleteProjectModal = ({
	open,
	project,
	onClose,
}: ProjectLifecycleModalProps) => {
	const router = useRouter();
	const { t } = useTranslate();
	const [confirmationName, setConfirmationName] = useState("");

	const { data: preview, isFetching: isFetchingPreview } = useQuery({
		queryKey: ["project-delete-preview", project?.id],
		queryFn: () => getProjectDeletionPreview(project?.id),
		enabled: !!project?.id && open,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: deleteProject, isPending: isDeletingProject } =
		useMutation({
			mutationFn: () =>
				axios
					.post<prismaClient.Project>("/api/user/project/lifecycle", {
						id: project?.id,
						action: "delete",
					})
					.then((res) => res.data),
		});

	const handleClose = () => {
		setConfirmationName("");
		onClose();
	};

	const handleDelete = async () => {
		if (!project) return;

		try {
			await deleteProject();
			message.success(
				t(
					"project.settings.danger.delete.success",
					"Project deleted successfully",
				),
			);
			await router.push("/hub");
		} catch (error) {
			message.error(getErrorMessage(error));
		}
	};

	const deleteDisabled =
		!preview?.canDelete || confirmationName !== project?.name;

	return (
		<Modal
			centered
			open={open}
			title={t("project.settings.danger.delete.title", "Delete Project")}
			okText={t("project.settings.danger.delete.confirm", "Delete")}
			okButtonProps={{
				danger: true,
				style: { display: preview?.canDelete ? "block" : "none" },
				disabled: isFetchingPreview || deleteDisabled,
			}}
			confirmLoading={isDeletingProject}
			onOk={handleDelete}
			onCancel={handleClose}
			cancelText={t("project.settings.danger.cancel", "Cancel")}
			width={760}
		>
			<Spin spinning={isFetchingPreview}>
				<Space
					orientation="vertical"
					size="middle"
					className={styles.modalBody}
				>
					<Text>
						{t(
							"project.settings.danger.preview.title",
							"All project data will be deleted without the ability to restore.",
						)}
					</Text>

					{preview && !preview.canDelete ? (
						<Alert
							type="error"
							showIcon
							icon={<IconExclamationCircle size={24} />}
							message={t(
								"project.settings.danger.delete.blocked",
								"This project cannot be deleted. Use Archive Project instead to preserve required history.",
							)}
							description={
								preview.blockers.length ? (
									<Space orientation="vertical" size="small">
										<Text>
											{t(
												"project.settings.danger.delete.blockedDescription",
												"The project cannot be deleted because it has the following blockers:",
											)}
										</Text>

										<ul className={styles.blockers}>
											{preview.blockers.map((blocker) => (
												<li key={blocker}>{blocker}</li>
											))}
										</ul>
									</Space>
								) : null
							}
						/>
					) : null}

					{preview?.canDelete ? (
						<div>
							<Text strong>
								{t(
									"project.settings.danger.preview.willDelete",
									"Will be deleted:",
								)}
							</Text>
							{renderImpactList(
								preview.willDelete,
								t(
									"project.settings.danger.preview.noDeleteItems",
									"No data will be deleted.",
								),
							)}
						</div>
					) : null}

					{preview?.canDelete && preview.willUpdate.length > 0 ? (
						<div>
							<Text strong>
								{t(
									"project.settings.danger.preview.willUpdate",
									"Will be updated before deletion",
								)}
							</Text>
							{renderImpactList(
								preview.willUpdate,
								t(
									"project.settings.danger.preview.noUpdateItems",
									"No data will be updated.",
								),
							)}
						</div>
					) : null}

					{preview?.canDelete ? (
						<Form layout="vertical">
							<Form.Item
								label={
									<Text>
										{t(
											"project.settings.danger.delete.confirmNameLabel",
											"Type the project name",
										)}{" "}
										<Text strong>{project?.name}</Text>{" "}
										{t(
											"project.settings.danger.delete.confirmNameSuffix",
											"to confirm deletion.",
										)}
									</Text>
								}
								className={styles.confirmationInput}
							>
								<Input
									value={confirmationName}
									onChange={(event) => setConfirmationName(event.target.value)}
									placeholder={project?.name}
								/>
							</Form.Item>
						</Form>
					) : null}
				</Space>
			</Spin>
		</Modal>
	);
};

export default DeleteProjectModal;
