import { useTranslate } from "@tolgee/react";
import { Input, Modal, message, Select, Space, Typography } from "antd";
import { useState } from "react";
import { useMyOpenPositions, useOpenVacancyChat } from "@/hooks/useVacancyChat";

const { Text } = Typography;

type OfferPositionModalProps = {
	open: boolean;
	/** Platform user id of the specialist receiving the offer. */
	candidateUserId?: string;
	onClose: () => void;
};

// Talent-pool outreach: the author picks one of their open positions, writes an
// optional message and a VacancyOffer chat invite is sent (chat-only — the
// specialist does NOT become a candidate unless they apply later). The chat is
// NOT opened here; it appears once the specialist accepts the invite.
const OfferPositionModal = ({
	open,
	candidateUserId,
	onClose,
}: OfferPositionModalProps) => {
	const { t } = useTranslate();
	const [vacancyId, setVacancyId] = useState<string>();
	const [offerMessage, setOfferMessage] = useState<string>();

	const { data: positions = [], isLoading } = useMyOpenPositions(open);
	const { openVacancyChat, isOpening } = useOpenVacancyChat();

	const close = () => {
		setVacancyId(undefined);
		setOfferMessage(undefined);
		onClose();
	};

	const handleOk = async () => {
		if (!vacancyId || !candidateUserId) return;
		try {
			await openVacancyChat({
				vacancyId,
				candidateUserId,
				message: offerMessage?.trim() || undefined,
				openDrawer: false,
			});

			message.success(
				t("offerPositionModal.success", "The offer was sent to the specialist"),
			);
			close();
		} catch (error: any) {
			message.error(error?.response?.data?.message || error.message);
		}
	};

	return (
		<Modal
			centered
			title={t("offerPositionModal.title", "Offer a position")}
			destroyOnHidden
			open={open}
			onCancel={close}
			onOk={handleOk}
			okText={t("offerPositionModal.okText", "Offer")}
			okButtonProps={{ disabled: !vacancyId }}
			confirmLoading={isLoading || isOpening}
		>
			<Space orientation="vertical" style={{ width: "100%" }} size={12}>
				<Text>
					{t(
						"offerPositionModal.positionText",
						"Choose one of your open positions to offer",
					)}
				</Text>
				<Select
					style={{ width: "100%" }}
					variant="filled"
					value={vacancyId}
					placeholder={t(
						"offerPositionModal.positionPlaceholder",
						"Select an open position",
					)}
					loading={isLoading}
					onChange={(value: string) => setVacancyId(value)}
					notFoundContent={
						isLoading
							? t("offerPositionModal.loading", "Loading…")
							: t(
									"offerPositionModal.noPositions",
									"You have no published vacancies",
								)
					}
					options={positions.map((position) => ({
						value: position.id,
						label: position.project
							? `${position.title} — ${position.project.name}`
							: position.title,
					}))}
				/>
				<Text>
					{t(
						"offerPositionModal.messageText",
						"Add a message for the specialist (optional)",
					)}
				</Text>
				<Input.TextArea
					rows={3}
					maxLength={500}
					variant="filled"
					showCount
					style={{ marginBottom: 24 }}
					placeholder={t(
						"offerPositionModal.messagePlaceholder",
						"Hi! I think you'd be a great fit for this position…",
					)}
					value={offerMessage}
					onChange={(e) => setOfferMessage(e.target.value)}
				/>
			</Space>
		</Modal>
	);
};

export default OfferPositionModal;
