import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Checkbox,
	Flex,
	Form,
	InputNumber,
	Modal,
	notification,
	Popconfirm,
	Select,
	Slider,
	Space,
	Spin,
	Typography,
} from "antd";
import axios from "axios";
import round from "lodash/round";
import { useEffect, useState } from "react";

const { Text, Paragraph } = Typography;

interface MemberEquityPromiseModalProps {
	open: boolean;
	onOk: (percentage: number, vested: boolean, targetStepId?: string) => void;
	onCancel: () => void;
	memberId: string;
	memberName: string;
	promiseId?: string;
	maxShare: number;
	projectId: string;
	isVested?: boolean;
	onDelete?: () => void;
}

const MemberEquityPromiseModal = ({
	open,
	promiseId,
	onOk,
	onCancel,
	memberId,
	memberName,
	maxShare,
	projectId,
	isVested = true,
	onDelete,
}: MemberEquityPromiseModalProps) => {
	const { t } = useTranslate();
	const [form] = Form.useForm();
	const [percentage, setPercentage] = useState<number>(0);
	const [targetStepId, setTargetStepId] = useState<string | undefined>(
		undefined,
	);
	const [deleteConfirmed, setDeleteConfirmed] = useState<boolean>(false);

	// Fetch the project's current step and every possible step
	const { data: workflowData } = useQuery({
		queryKey: ["project-workflow", projectId, open],
		queryFn: () =>
			axios.get("/api/user/project/workflow", { params: { projectId } }),
		enabled: !!projectId && open,
	});

	const { data: projectPromiseData, isLoading } = useQuery({
		queryKey: ["project-promise", promiseId],
		queryFn: () =>
			axios.get("/api/user/project/equity/promise", { params: { promiseId } }),
		enabled: !!promiseId,
	});

	useEffect(() => {
		if (!projectPromiseData?.data) return;

		setPercentage(projectPromiseData.data.percentage);
		setTargetStepId(projectPromiseData.data.targetStepId);
		form.setFieldsValue({
			percentage: projectPromiseData.data.percentage,
			targetStepId: projectPromiseData.data.targetStepId,
		});
	}, [projectPromiseData?.data]);

	// Selectable steps (only the ones after the current step)
	const availableSteps = workflowData?.data?.steps
		? workflowData.data.steps
				.filter(
					(step: any) =>
						step.order >= (workflowData.data.currentStep?.order || 0),
				)
				.map((step: any) => ({
					label:
						step.order === workflowData.data.currentStep?.order
							? `${step.name} (current)`
							: step.name,
					value: step.id,
				}))
		: [];

	// Reset the values when the modal opens
	useEffect(() => {
		if (open) {
			setPercentage(0);
			form.setFieldsValue({
				percentage: 0,
				targetStepId: undefined,
			});
		}
	}, [open, form]);

	// Slider / input change handler
	const handlePercentageChange = (value: number | null) => {
		setPercentage(value || 0);
	};

	// Target step change handler
	const handleTargetStepChange = (value: string) => {
		setTargetStepId(value);
	};

	// Mutation for creating a member share
	const { mutateAsync: createMemberShare, isPending: isCreating } = useMutation(
		{
			mutationFn: (data: {
				projectId: string;
				memberId: string;
				percentage: number;
				targetStepId?: string;
			}) => axios.post<any>("/api/user/project/equity/member", data),
			onSuccess: () => {
				onOk(percentage, isVested, targetStepId);
			},
			onError: (error: any) => {
				console.error("Error while creating member share:", error);
			},
		},
	);

	// Mutation for updating a member share
	const { mutateAsync: updateMemberShare, isPending: isUpdating } = useMutation(
		{
			mutationFn: (data: {
				promiseId: string;
				percentage: number;
				targetStepId?: string;
			}) => axios.put<any>("/api/user/project/equity/member", data),
			onSuccess: () => {
				onOk(percentage, isVested, targetStepId);
			},
			onError: (error: any) => {
				console.error("Error while updating member share:", error);
			},
		},
	);

	// Mutation for deleting a member share
	const { mutateAsync: deleteMemberShare, isPending: isDeleting } = useMutation(
		{
			mutationFn: (data: { promiseId: string }) =>
				axios.delete<any>("/api/user/project/equity/member", {
					params: { promiseId },
				}),
			onSuccess: () => {
				if (onDelete) onDelete();
				onCancel();
			},
			onError: (error: any) => {
				console.error("Error while deleting member share:", error);
			},
		},
	);

	// Save handler
	const handleOk = async () => {
		try {
			await form.validateFields();

			if (promiseId) {
				await updateMemberShare({
					promiseId,
					percentage,
					targetStepId,
				});
			} else {
				await createMemberShare({
					projectId,
					memberId,
					percentage,
					targetStepId,
				});
			}
		} catch (error) {
			console.error("Validation failed:", error);
		}
	};

	// Delete handler
	const handleDelete = async (promiseId: string) => {
		if (!deleteConfirmed) {
			notification.error({
				message: t(
					"equityPromise.delete.confirm.error",
					"You should confirm that the member has been informed about the deletion",
				),
			});
			return;
		}

		try {
			await deleteMemberShare({ promiseId });
			onCancel();
		} catch (error) {
			console.error("Error during deletion:", error);
		}
	};

	const handleDeleteConfirmChange = (e: any) => {
		setDeleteConfirmed(e.target.checked);
	};

	return (
		<Modal
			title={
				promiseId
					? t(
							"modal.memberEquityPromise.update.title",
							"Update Promise for {memberName}",
							{
								memberName,
							},
						)
					: t(
							"modal.memberEquityPromise.create.title",
							"New Promise for {memberName}",
							{
								memberName,
							},
						)
			}
			open={open}
			centered
			width={600}
			onCancel={onCancel}
			confirmLoading={isCreating || isUpdating}
			footer={
				<Flex style={{ width: "100%" }} justify="space-between">
					<div>
						{promiseId && (
							<Popconfirm
								key="delete"
								title={t(
									"modal.memberEquityPromise.delete.title",
									"Delete equity promise",
								)}
								description={
									<div>
										<Paragraph>
											{t(
												"modal.memberEquityPromise.delete.description",
												"Are you sure you want to delete this equity promise?",
											)}
										</Paragraph>
										<Checkbox onChange={handleDeleteConfirmChange}>
											{t(
												"equityPromise.delete.confirm",
												"I confirm that I have discussed the removal of this equity promise with the member.",
											)}
										</Checkbox>
									</div>
								}
								onConfirm={() => handleDelete(promiseId)}
								okText={t("Delete")}
								cancelText={t("Cancel")}
								okButtonProps={{ danger: true, loading: isDeleting }}
							>
								<Button key="delete" icon={<IconTrash />} danger type="text" />
							</Popconfirm>
						)}
					</div>
					<Space>
						<Button key="cancel" onClick={onCancel}>
							{t("Cancel")}
						</Button>
						<Button
							key="submit"
							type="primary"
							onClick={handleOk}
							loading={isCreating || isUpdating}
						>
							{t("Save")}
						</Button>
					</Space>
				</Flex>
			}
		>
			<Space orientation="vertical" style={{ width: "100%" }} size="large">
				<Paragraph type="secondary">
					{t(
						"Promised shares will be automatically vested when the project reaches the specified workflow step.",
					)}
				</Paragraph>

				<Spin spinning={isLoading && !!promiseId}>
					<Form form={form} variant="filled" layout="vertical">
						<Form.Item
							label={t("Share Percentage")}
							name="percentage"
							initialValue={0}
							required
						>
							<Flex align="center" gap={16}>
								<div style={{ flex: 1 }}>
									<Slider
										min={0}
										max={round(maxShare, 2)}
										step={0.1}
										value={percentage}
										marks={Object.fromEntries([
											...[...Array(Math.floor(maxShare / 10))].map((_, i) => [
												i * 10,
												`${i * 10}%`,
											]),
											[round(maxShare, 2), `${round(maxShare, 2)}%`],
										])}
										onChange={handlePercentageChange}
									/>
								</div>
								<InputNumber
									min={0}
									max={round(maxShare, 2)}
									step={0.1}
									value={percentage}
									onChange={handlePercentageChange}
									addonAfter="%"
									style={{ width: "110px" }}
								/>
							</Flex>
						</Form.Item>

						<Form.Item
							name="targetStepId"
							label={t("Vesting at Workflow Step")}
							rules={[{ required: true, message: t("This field is required") }]}
						>
							<Select
								placeholder={t("Select the step for vesting")}
								onChange={handleTargetStepChange}
								allowClear
								options={availableSteps}
							/>
						</Form.Item>

						<Form.Item
							name="confirmEquityTerms"
							valuePropName="checked"
							noStyle
							rules={[
								{
									validator: (_, value) => {
										if (!value) {
											notification.error({
												message: t(
													"equityPromise.confirm.error",
													"You should confirm the accuracy of the information entered",
												),
											});
										}
										return value ? Promise.resolve() : Promise.reject();
									},
								},
							]}
						>
							<Checkbox>
								{t(
									"equityPromise.confirm",
									"I confirm that I have discussed the equity terms with the member, and they have agreed to these conditions.",
								)}
							</Checkbox>
						</Form.Item>
					</Form>
				</Spin>
			</Space>
		</Modal>
	);
};

export default MemberEquityPromiseModal;
