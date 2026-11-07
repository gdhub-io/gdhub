import { IconExclamationCircle, IconHelpCircle } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	Flex,
	Form,
	Input,
	Modal,
	message,
	Space,
	Spin,
	Tooltip,
	Typography,
} from "antd";
import axios from "axios";
import { useState } from "react";
import { signOutWithChat } from "@/components/Chat/session";
import { LoadError } from "@/components/ui";
import {
	getErrorMessage,
	getUserDeletionPreview,
	renderImpactList,
} from "./shared";
import styles from "./style.module.scss";

const { Text } = Typography;

type DeleteAccountModalProps = {
	open: boolean;
	userEmail?: string | null;
	onClose: () => void;
};

const SectionTitle = ({
	label,
	tooltip,
}: {
	label: string;
	tooltip: string;
}) => (
	<Space size={4} align="center">
		<Text strong>{label}</Text>
		<Tooltip title={tooltip} overlayStyle={{ maxWidth: 320 }}>
			<IconHelpCircle
				size={14}
				style={{ display: "flex", cursor: "help", opacity: 0.45 }}
			/>
		</Tooltip>
	</Space>
);

const DeleteAccountModal = ({
	open,
	userEmail,
	onClose,
}: DeleteAccountModalProps) => {
	const { t } = useTranslate();
	const [confirmationEmail, setConfirmationEmail] = useState("");
	const [reason, setReason] = useState("");

	const {
		data: preview,
		isFetching: isFetchingPreview,
		isLoadingError: isPreviewFailed,
		refetch: refetchPreview,
	} = useQuery({
		queryKey: ["user-delete-preview"],
		queryFn: getUserDeletionPreview,
		enabled: open,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: deleteAccount, isPending: isDeletingAccount } =
		useMutation({
			mutationFn: () =>
				axios
					.post("/api/user/privacy", {
						action: "delete-personal-data",
						reason: reason || undefined,
					})
					.then((res) => res.data),
		});

	const handleClose = () => {
		setConfirmationEmail("");
		setReason("");
		onClose();
	};

	const handleDelete = async () => {
		try {
			await deleteAccount();
			message.success(
				t(
					"profile.settings.danger.delete.success",
					"Your account has been anonymized successfully",
				),
			);
			await signOutWithChat({ callbackUrl: "/" });
		} catch (error) {
			message.error(getErrorMessage(error));
		}
	};

	const deleteDisabled = confirmationEmail !== userEmail;

	return (
		<Modal
			centered
			open={open}
			title={t("profile.settings.danger.delete.title", "Delete Account")}
			okText={t("profile.settings.danger.delete.confirm", "Delete Account")}
			okButtonProps={{
				danger: true,
				disabled: isFetchingPreview || deleteDisabled,
			}}
			confirmLoading={isDeletingAccount}
			onOk={handleDelete}
			onCancel={handleClose}
			cancelText={t("profile.settings.danger.cancel", "Cancel")}
			width={760}
		>
			<Spin spinning={isFetchingPreview}>
				<Space
					orientation="vertical"
					size="middle"
					className={styles.modalBody}
				>
					<Alert
						type="warning"
						showIcon
						icon={<IconExclamationCircle size={24} />}
						title={t(
							"profile.settings.danger.delete.warning",
							"This action is irreversible. Your personal data will be anonymized and you will be signed out.",
						)}
					/>

					{isPreviewFailed && (
						<LoadError
							title={t(
								"profile.settings.danger.preview.load-error",
								"What will be deleted could not be loaded",
							)}
							onRetry={refetchPreview}
						/>
					)}

					{preview?.willDelete && preview.willDelete.length > 0 ? (
						<div>
							<SectionTitle
								label={t(
									"profile.settings.danger.preview.willDelete",
									"Will be deleted:",
								)}
								tooltip={t(
									"profile.settings.danger.preview.willDeleteTooltip",
									"Permanently erased from our servers — no way to recover. This is your right to erasure under GDPR Art. 17.",
								)}
							/>
							{renderImpactList(
								preview.willDelete,
								t(
									"profile.settings.danger.preview.noDeleteItems",
									"No data will be deleted.",
								),
							)}
						</div>
					) : null}

					{preview?.willAnonymize && preview.willAnonymize.length > 0 ? (
						<div>
							<SectionTitle
								label={t(
									"profile.settings.danger.preview.willAnonymize",
									"Will be anonymized:",
								)}
								tooltip={t(
									"profile.settings.danger.preview.willAnonymizeTooltip",
									"Your name, email, and other identifiers are replaced with generic placeholders (e.g. 'Deleted user'). The record still exists, but no one can link it back to you. GDPR considers anonymized data to no longer be personal data — it's legally equivalent to deletion (Recital 26).",
								)}
							/>
							{renderImpactList(
								preview.willAnonymize,
								t(
									"profile.settings.danger.preview.noAnonymizeItems",
									"No data will be anonymized.",
								),
							)}
						</div>
					) : null}

					{preview?.willDetach && preview.willDetach.length > 0 ? (
						<div>
							<SectionTitle
								label={t(
									"profile.settings.danger.preview.willDetach",
									"Will be detached:",
								)}
								tooltip={t(
									"profile.settings.danger.preview.willDetachTooltip",
									"Your user ID is removed from these records (set to null). The entries remain for system integrity but no longer point to you in any way.",
								)}
							/>
							{renderImpactList(
								preview.willDetach,
								t(
									"profile.settings.danger.preview.noDetachItems",
									"No data will be detached.",
								),
							)}
						</div>
					) : null}

					{preview?.willKeep && preview.willKeep.length > 0 ? (
						<div>
							<SectionTitle
								label={t(
									"profile.settings.danger.preview.willKeep",
									"Will be kept:",
								)}
								tooltip={t(
									"profile.settings.danger.preview.willKeepTooltip",
									"These records involve other people's rights too — equity agreements, financial transactions, legal events. They stay linked to an anonymous placeholder, not your real identity. The law allows retaining shared history even after a deletion request (GDPR Art. 89).",
								)}
							/>
							{renderImpactList(
								preview.willKeep,
								t(
									"profile.settings.danger.preview.noKeepItems",
									"No data will be kept.",
								),
							)}
						</div>
					) : null}

					<Form layout="vertical">
						<Flex vertical gap={16}>
							<Form.Item
								label={
									<Text>
										{t(
											"profile.settings.danger.delete.confirmEmailLabel",
											"Type your email",
										)}{" "}
										<Text strong>{userEmail}</Text>{" "}
										{t(
											"profile.settings.danger.delete.confirmEmailSuffix",
											"to confirm deletion.",
										)}
									</Text>
								}
								className={styles.confirmationInput}
							>
								<Input
									value={confirmationEmail}
									onChange={(e) => setConfirmationEmail(e.target.value)}
									placeholder={userEmail ?? ""}
								/>
							</Form.Item>

							<Form.Item
								label={
									<Text>
										{t(
											"profile.settings.danger.delete.reasonLabel",
											"Reason for deletion (optional)",
										)}
									</Text>
								}
							>
								<Input.TextArea
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder={t(
										"profile.settings.danger.delete.reasonPlaceholder",
										"Tell us why you want to delete your account...",
									)}
									rows={3}
								/>
							</Form.Item>
						</Flex>
					</Form>
				</Space>
			</Spin>
		</Modal>
	);
};

export default DeleteAccountModal;
