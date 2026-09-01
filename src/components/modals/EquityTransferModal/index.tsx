import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Divider,
	Form,
	Input,
	InputNumber,
	Modal,
	Select,
	Space,
	Typography,
} from "antd";
import axios from "axios";
import { useEffect, useState } from "react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import styles from "./styles.module.scss";

const { Text, Title } = Typography;
const { Option } = Select;

interface EquityTransferModalProps {
	open: boolean;
	onCancel: () => void;
	projectId: string;
	currentUserId: string;
	teamMembers: any[]; // Assuming this is an array of team members
}

interface TransferFormData {
	toUserId: string;
	percentage: number;
	reason?: string;
}

const EquityTransferModal = ({
	open,
	onCancel,
	projectId,
	currentUserId,
	teamMembers,
}: EquityTransferModalProps) => {
	const { t } = useTranslate();
	const [form] = Form.useForm<TransferFormData>();
	const queryClient = useQueryClient();
	const [currentEquity, setCurrentEquity] = useState<number>(0);

	// Fetch the current project's shares
	const { data: equityData, isLoading: isLoadingEquity } = useQuery({
		queryKey: ["project-equity", projectId],
		queryFn: () =>
			axios.get("/api/user/project/equity", {
				params: { projectId },
			}),
		enabled: open && !!projectId,
	});

	useEffect(() => {
		const currentUserShare = equityData?.data.equityAllocations?.find(
			(allocation: any) => allocation.ownerId === currentUserId,
		);
		setCurrentEquity(currentUserShare?.percentage || 0);
	}, [equityData]);

	// Mutation for transferring a share
	const { mutateAsync: transferEquity, isPending: isTransferring } =
		useMutation({
			mutationFn: (data: TransferFormData) =>
				axios.post("/api/user/project/equity/transaction/transfer", {
					projectId,
					toUserId: data.toUserId,
					percentage: data.percentage,
					reason: data.reason,
				}),
			onSuccess: () => {
				// Invalidate the shares and transactions queries
				queryClient.invalidateQueries({
					queryKey: ["project-equity", projectId],
				});
				queryClient.invalidateQueries({
					queryKey: ["equity-transactions", projectId],
				});
				onCancel();
				form.resetFields();
			},
		});

	// Reset the form when the modal opens
	useEffect(() => {
		if (open) {
			form.resetFields();
		}
	}, [open, form]);

	// Form submit handler
	const handleOk = async () => {
		try {
			const values = await form.validateFields();
			transferEquity(values);
		} catch (error) {
			console.error("Validation failed:", error);
		}
	};

	// Check the available share
	const validatePercentage = (_: any, value: number) => {
		if (value <= 0) {
			return Promise.reject(new Error(t("Доля должна быть больше 0")));
		}
		if (value > currentEquity) {
			return Promise.reject(new Error(t("Недостаточно долей для передачи")));
		}
		return Promise.resolve();
	};

	// Team members, without the current user
	const filteredTeamMembers = teamMembers.filter(
		(member) => member.userId !== currentUserId && member.status === "Active",
	);

	return (
		<Modal
			title={t("Передача доли участнику")}
			centered
			open={open}
			onCancel={onCancel}
			footer={null}
			width={500}
		>
			<div className={styles.container}>
				<Space orientation="vertical" style={{ width: "100%" }} size="large">
					<div className={styles.infoBox}>
						<Title level={5}>
							{t("Your current equity share in the project")}
						</Title>
						<Text strong>{currentEquity.toFixed(2)}%</Text>
						<Divider />
						<Text type="secondary">
							{t(
								"Transferring equity to another team member means you are transferring part of your rights in the project. This action cannot be undone.",
							)}
						</Text>
					</div>

					<Form
						form={form}
						layout="vertical"
						requiredMark={false}
						className={styles.form}
					>
						<Form.Item
							name="toUserId"
							label={t("Recipient of the equity share")}
							rules={[{ required: true, message: t("Select a recipient") }]}
						>
							<Select placeholder={t("Select a participant")}>
								{filteredTeamMembers.map((member) => (
									<Option key={member.userId} value={member.userId}>
										<div className={styles.memberOption}>
											<AppAvatar
												size="small"
												src={member.user?.image}
												icon={!member.user?.image}
											/>
											<span>
												{member.user?.name ||
													member.user?.email ||
													t("Участник")}
											</span>
										</div>
									</Option>
								))}
							</Select>
						</Form.Item>

						<Form.Item
							name="percentage"
							label={t("Equity share to transfer (%)")}
							rules={[
								{
									required: true,
									message: t("Specify the equity share to transfer"),
								},
								{ validator: validatePercentage },
							]}
						>
							<InputNumber
								min={0.01}
								max={currentEquity}
								step={0.1}
								precision={2}
								style={{ width: "100%" }}
								addonAfter="%"
							/>
						</Form.Item>

						<Form.Item
							name="reason"
							label={t("Reason for transfer (optional)")}
						>
							<Input.TextArea
								rows={3}
								placeholder={t(
									"Specify the reason for transferring the equity share",
								)}
							/>
						</Form.Item>
					</Form>

					<div className={styles.actions}>
						<Button onClick={onCancel}>{t("Cancel")}</Button>
						<Button
							type="primary"
							loading={isTransferring}
							onClick={handleOk}
							disabled={currentEquity <= 0}
						>
							{t("Transfer equity")}
						</Button>
					</div>
				</Space>
			</div>
		</Modal>
	);
};

export default EquityTransferModal;
