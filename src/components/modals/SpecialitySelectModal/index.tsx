import type { Speciality } from "@gdhub-io/gdhub-prisma";
import { BsCheckLg } from "@react-icons/all-files/bs/BsCheckLg";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Input, List, Modal, Spin } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";

const SpecialitySelectModal = ({ open = false, onOk, onCancel }: any) => {
	const { t } = useTranslate();
	const [processing, setProcessing] = useState(false);
	const [selectedItem, setSelectedItem] = useState<string>();
	const [applicationMessage, setApplicationMessage] = useState<string>();

	const {
		data: specialities,
		isLoading,
		refetch: fetchSpecialities,
	} = useQuery({
		queryKey: ["user-specialities"],
		queryFn: () => axios.get<Speciality[]>("/api/user/specialities"),
	});

	useEffect(() => {
		if (open) {
			fetchSpecialities();
			setSelectedItem(undefined);
		}
	}, [open]);

	const handleCancel = () => {
		onCancel();
	};

	const handleOk = async () => {
		try {
			setProcessing(true);

			await onOk({
				specialityId: selectedItem,
				applicationMessage: applicationMessage?.trim() || undefined,
			});

			setProcessing(false);
		} catch (error) {
			console.error(error);
			setProcessing(false);
		}
	};

	return (
		<>
			<Modal
				centered
				title={null}
				destroyOnHidden
				okButtonProps={{ disabled: !selectedItem }}
				mask={{ closable: false }}
				okText={t("modal.speciality-select.okText", "Choose")}
				onOk={handleOk}
				cancelText={t("modal.specialitySelect.close", "Close")}
				open={open}
				onCancel={handleCancel}
				confirmLoading={isLoading || processing}
			>
				<Spin spinning={isLoading || processing}>
					<p>
						{t(
							"modal.speciality-select.choose-text",
							"Choose your specialty that corresponds to the selected vacancy",
						)}
					</p>
					<List
						bordered
						dataSource={specialities?.data}
						renderItem={(speciality) => (
							<List.Item
								style={{
									cursor: "pointer",
									fontWeight: selectedItem == speciality.id ? "bold" : "normal",
								}}
								onClick={() => setSelectedItem(speciality.id)}
								actions={
									selectedItem == speciality.id
										? [
												<BsCheckLg
													color="var(--gd-neutral-950)"
													key="icon-check-speciality"
												/>,
											]
										: []
								}
							>
								{speciality.name}
							</List.Item>
						)}
					/>

					<br />
					<p>
						{t(
							"modal.speciality-select.greeting-text",
							"Add a short message for the project author (optional)",
						)}
					</p>
					<Input.TextArea
						rows={3}
						maxLength={1000}
						showCount
						placeholder={t(
							"modal.speciality-select.greeting-placeholder",
							"Hi! I'd love to join your project because…",
						)}
						value={applicationMessage}
						onChange={(e) => setApplicationMessage(e.target.value)}
					/>
				</Spin>
			</Modal>
		</>
	);
};

export default SpecialitySelectModal;
