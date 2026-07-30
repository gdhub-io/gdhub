import { useMutation } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import { Flex, Modal, message, Select, Typography } from "antd";
import axios from "axios";
import type React from "react";
import { useState } from "react";
import { Language } from "@/config/prisma-enums";

const { Text } = Typography;

interface CreateLocaleVersionModalProps {
	open: boolean;
	eventId: string | null;
	currentLang: Language | null;
	onCancel: () => void;
	onSuccess: () => void;
}

const CreateLocaleVersionModal: React.FC<CreateLocaleVersionModalProps> = ({
	open,
	eventId,
	currentLang,
	onCancel,
	onSuccess,
}) => {
	const { t } = useTolgee();
	const [selectedLocaleLang, setSelectedLocaleLang] = useState<Language | null>(
		null,
	);

	const { mutateAsync: createLocaleVersionEvent, isPending: isCreating } =
		useMutation({
			mutationFn: ({ id, lang }: { id: string; lang: Language }) =>
				axios
					.post(`/api/user/event/${id}/duplicate`, { lang })
					.then((res) => res.data),
			onSuccess: () => {
				message.success(
					t("event.createLocaleVersion.success", "Locale version created"),
				);
				onSuccess();
			},
			onError: () => {
				message.error(
					t("event.createLocaleVersion.error", "Error creating locale version"),
				);
			},
		});

	const handleOk = async () => {
		if (!eventId || !selectedLocaleLang) return;

		await createLocaleVersionEvent({ id: eventId, lang: selectedLocaleLang });
		setSelectedLocaleLang(null);
		onCancel();
	};

	const handleCancel = () => {
		setSelectedLocaleLang(null);
		onCancel();
	};

	return (
		<Modal
			open={open}
			title={t("event.newLocaleVersion.confirm", "New locale version")}
			onOk={handleOk}
			onCancel={handleCancel}
			okText={t("event.newLocaleVersion.confirm", "Create")}
			cancelText={t("event.newLocaleVersion.cancel", "Cancel")}
			centered
			confirmLoading={isCreating}
			okButtonProps={{ disabled: !selectedLocaleLang }}
		>
			<Flex vertical gap={4} style={{ marginBottom: 16 }}>
				<Text>
					{t(
						"event.newLocaleVersion.description",
						"Select the language for the new locale version",
					)}
				</Text>
				<Select
					value={selectedLocaleLang}
					onChange={(value) => setSelectedLocaleLang(value)}
					options={Object.values(Language)
						.filter((lang) => currentLang && lang !== currentLang)
						.map((lang) => ({ label: lang, value: lang }))}
					placeholder={t(
						"event.newLocaleVersion.selectLanguage",
						"Select language",
					)}
				/>
			</Flex>
		</Modal>
	);
};

export default CreateLocaleVersionModal;
