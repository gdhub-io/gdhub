import { IconDatabase, IconLock } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Alert, Collapse, Modal, message, Space, Typography } from "antd";
import axios from "axios";
import { getErrorMessage } from "./shared";
import styles from "./style.module.scss";

const { Text } = Typography;

const INCLUDED_CATEGORIES = [
	{
		label: "Identity & Access",
		items: "Account info, auth providers, active sessions",
	},
	{
		label: "Profile & Skills",
		items: "Public profile, specializations, interests",
	},
	{
		label: "Projects & Teams",
		items: "Projects, reports, estimations, team memberships, investments",
	},
	{
		label: "Learning & Events",
		items: "Courses, lectures, events, chat memberships",
	},
	{
		label: "Financial & Legal",
		items: "Equity allocations, subscriptions, signed agreements, legal events",
	},
	{
		label: "Activity",
		items:
			"Advice requests, team invitations, blog posts, documents, AI sessions, audit logs",
	},
];

type ExportDataModalProps = {
	open: boolean;
	onClose: () => void;
};

const ExportDataModal = ({ open, onClose }: ExportDataModalProps) => {
	const { t } = useTranslate();

	const { mutateAsync: exportData, isPending: isExporting } = useMutation({
		mutationFn: () =>
			axios
				.get<object>("/api/user/privacy", { params: { action: "export" } })
				.then((res) => res.data),
	});

	const handleExport = async () => {
		try {
			const data = await exportData();
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `personal-data-export-${Date.now()}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			message.success(
				t(
					"profile.settings.danger.export.success",
					"Your data has been exported successfully",
				),
			);
			onClose();
		} catch (error) {
			message.error(getErrorMessage(error));
		}
	};

	return (
		<Modal
			centered
			open={open}
			title={t("profile.settings.danger.export.title", "Export Personal Data")}
			okText={t("profile.settings.danger.export.confirm", "Export")}
			confirmLoading={isExporting}
			onOk={handleExport}
			onCancel={onClose}
			cancelText={t("profile.settings.danger.cancel", "Cancel")}
			width={600}
		>
			<Space orientation="vertical" size="middle" className={styles.modalBody}>
				<Text>
					{t(
						"profile.settings.danger.export.description",
						"Download a machine-readable JSON archive of all your personal data stored on the platform.",
					)}
				</Text>

				<Alert
					type="info"
					showIcon
					message={t(
						"profile.settings.danger.export.legalBasis",
						"Legal basis: GDPR Art. 15 (Right of access) & Art. 20 (Right to data portability)",
					)}
				/>

				<Collapse
					ghost
					size="small"
					items={[
						{
							key: "included",
							label: (
								<Space>
									<IconDatabase size={14} style={{ display: "flex" }} />
									<Text>
										{t(
											"profile.settings.danger.export.includedLabel",
											"What's included in the export",
										)}
									</Text>
								</Space>
							),
							children: (
								<Space
									orientation="vertical"
									size={4}
									className={styles.categoryList}
								>
									{INCLUDED_CATEGORIES.map((cat) => (
										<div key={cat.label}>
											<Text strong>{cat.label}:</Text>{" "}
											<Text type="secondary">{cat.items}</Text>
										</div>
									))}
								</Space>
							),
						},
						{
							key: "excluded",
							label: (
								<Space>
									<IconLock size={14} style={{ display: "flex" }} />
									<Text>
										{t(
											"profile.settings.danger.export.excludedLabel",
											"What's intentionally excluded",
										)}
									</Text>
								</Space>
							),
							children: (
								<Space
									orientation="vertical"
									size={4}
									className={styles.categoryList}
								>
									<div>
										<Text strong>OAuth tokens & session secrets</Text>{" "}
										<Text type="secondary">— security risk if exposed</Text>
									</div>
									<div>
										<Text strong>Other users' personal data</Text>{" "}
										<Text type="secondary">
											— emails of people you invited, third-party Telegram
											profiles from advice requests
										</Text>
									</div>
									<div>
										<Text strong>System event payloads</Text>{" "}
										<Text type="secondary">
											— may contain other users' data
										</Text>
									</div>
								</Space>
							),
						},
					]}
				/>
			</Space>
		</Modal>
	);
};

export default ExportDataModal;
