import { useTranslate } from "@tolgee/react";
import { Button, Card, Flex, Space, Typography } from "antd";
import { useSession } from "next-auth/react";
import { useState } from "react";
import DeleteAccountModal from "./DeleteAccountModal";
import ExportDataModal from "./ExportDataModal";
import styles from "./style.module.scss";

const { Text } = Typography;

const DangerProfileForm = () => {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const [isExportModalOpen, setIsExportModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

	return (
		<Space orientation="vertical" size="large" className={styles.container}>
			<Text type="secondary">
				{t(
					"profile.settings.danger.description",
					"Export your data or permanently remove your personal information.",
				)}
			</Text>

			<Card variant="borderless">
				<Card.Meta
					title={
						<Flex justify="space-between" align="center">
							{t(
								"profile.settings.danger.export.cardTitle",
								"Export Personal Data",
							)}
							<Button type="primary" onClick={() => setIsExportModalOpen(true)}>
								{t("profile.settings.danger.export.button", "Export")}
							</Button>
						</Flex>
					}
					description={
						<Text>
							{t(
								"profile.settings.danger.export.cardDescription",
								"Download a copy of all your personal data stored in the system.",
							)}
						</Text>
					}
				/>
			</Card>

			<Card variant="borderless">
				<Card.Meta
					title={
						<Flex justify="space-between" align="center">
							{t("profile.settings.danger.delete.cardTitle", "Delete Account")}
							<Button
								type="primary"
								danger
								onClick={() => setIsDeleteModalOpen(true)}
							>
								{t("profile.settings.danger.delete.button", "Delete Account")}
							</Button>
						</Flex>
					}
					description={
						<Text>
							{t(
								"profile.settings.danger.delete.cardDescription",
								"Permanently anonymize your personal data. Your projects and contributions will be preserved but unlinked from your identity.",
							)}
						</Text>
					}
				/>
			</Card>

			<ExportDataModal
				open={isExportModalOpen}
				onClose={() => setIsExportModalOpen(false)}
			/>
			<DeleteAccountModal
				open={isDeleteModalOpen}
				userEmail={session?.user?.email}
				onClose={() => setIsDeleteModalOpen(false)}
			/>
		</Space>
	);
};

export default DangerProfileForm;
