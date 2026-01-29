import { DeleteOutlined } from "@ant-design/icons";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { MdOutlineHandshake } from "@react-icons/all-files/md/MdOutlineHandshake";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Col,
	DatePicker,
	Form,
	Input,
	InputNumber,
	Modal,
	message,
	Popconfirm,
	Popover,
	Row,
	Select,
	Space,
	Spin,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { gtmEventTrigger } from "@/helpers/gtm";
import { useWorkDirections } from "@/hooks/library";
import styles from "./style.module.scss";

interface VacancyModalProps {
	teamId?: string;
	projectId?: string;
	vacancyId?: string;
	open: boolean;
	onOk: () => void;
	onCancel: () => void;
}

const VacancyModal = ({
	teamId,
	projectId,
	vacancyId,
	open,
	onOk,
	onCancel,
}: VacancyModalProps) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const { options: directionsOptions } = useWorkDirections();
	const [showPromiseFields, setShowPromiseFields] = useState(false);

	const {
		data: vacancy,
		refetch: fetchVacancy,
		isFetching: isLoadingVacancy,
	} = useQuery({
		queryKey: ["vacancy", vacancyId],
		queryFn: () =>
			axios.get<prismaClient.TeamVacancy>("/api/user/project/vacancy", {
				params: { id: vacancyId },
			}),
		enabled: !!vacancyId,
		staleTime: Infinity,
	});

	const { data: workflowData, isLoading: isLoadingWorkflow } = useQuery({
		queryKey: ["project-workflow", projectId],
		queryFn: () =>
			axios.get("/api/user/project/workflow", { params: { projectId } }),
		enabled: !!projectId,
	});

	const { data: maxAvailableShareData, refetch: refetchAvailableShare } =
		useQuery({
			queryKey: ["team-max-available-share", teamId],
			queryFn: () =>
				axios.get("/api/user/project/team/max-available-share", {
					params: { id: teamId },
				}),
			enabled: !!teamId,
			refetchInterval: false,
			refetchOnWindowFocus: false,
		});

	const maxAvailableShare = maxAvailableShareData?.data?.maxAvailableShare || 0;
	const currentVacancyPromise = vacancy?.data?.promisePercentage || 0;

	// Calculate max available share considering current vacancy's promise
	const adjustedMaxAvailableShare = maxAvailableShare + currentVacancyPromise;

	const { mutateAsync: createVacancy, isPending: isCreating } = useMutation({
		mutationFn: (data: Record<string, any>) =>
			axios.post<any>("/api/user/project/vacancy", data),
	});
	const { mutateAsync: saveVacancy, isPending: isUpdating } = useMutation({
		mutationFn: (params: { id: string; data: Record<string, any> }) =>
			axios.put<any>("/api/user/project/vacancy", params.data, {
				params: { id: params.id },
			}),
	});

	useEffect(() => {
		if (open) refetchAvailableShare();

		if (open && vacancyId) {
			fetchVacancy().then((res) => {
				const data = res.data?.data;
				form.setFieldsValue({ ...data, finishedAt: dayjs(data?.finishedAt) });
				setShowPromiseFields(!!data?.promisePercentage);
			});
		}
	}, [open]);

	const handleOk = async (asDraft?: { asDraft: boolean }) => {
		try {
			const formData = await form.validateFields();

			if (vacancyId) {
				await saveVacancy({
					id: vacancyId,
					data: {
						...formData,
						publishedAt: asDraft ? null : dayjs().toISOString(),
						status: asDraft
							? prismaClient.TeamVacancyStatus.Draft
							: prismaClient.TeamVacancyStatus.Published,
						teamId,
						promisePercentage: formData.promisePercentage || null,
						promiseStepId: formData.promiseStepId || null,
					},
				});
			} else {
				await createVacancy({
					...formData,
					publishedAt: asDraft ? null : dayjs().toISOString(),
					status: asDraft
						? prismaClient.TeamVacancyStatus.Draft
						: prismaClient.TeamVacancyStatus.Published,
					teamId,
					promisePercentage: formData.promisePercentage || null,
					promiseStepId: formData.promiseStepId || null,
				});
				gtmEventTrigger("vacancy_create", { teamId, title: formData.title });
			}

			form.resetFields();
			setShowPromiseFields(false);
			message.success(
				vacancyId
					? t("The position is changed")
					: t("A new open position has been added"),
			);
			onOk();
		} catch (error: any) {
			if (!Object.hasOwn(error, "errorFields")) {
				message.error(error.message);
			} else {
				message.error(
					t("form.error", "Error.Check if all data is entered correctly"),
				);
			}
		}
	};

	const handleCancel = () => {
		form.resetFields();
		setShowPromiseFields(false);
		onCancel();
	};

	// Получаем доступные для выбора шаги (только следующие за текущим)
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

	return (
		<Modal
			centered
			className={styles.modal}
			title={vacancyId ? t("Change the position") : t("Create a new position")}
			width={800}
			destroyOnHidden
			maskClosable={false}
			open={open}
			onCancel={handleCancel}
			confirmLoading={isLoadingVacancy || isUpdating || isCreating}
			footer={[
				<Space key="form-buttons" wrap>
					<Button
						key="close"
						onClick={handleCancel}
						disabled={isLoadingVacancy || isUpdating || isCreating}
					>
						{t("Close")}
					</Button>
					<Button
						key="draft"
						disabled={isLoadingVacancy || isUpdating || isCreating}
						onClick={() => handleOk({ asDraft: true })}
					>
						{t("Save as draft")}
					</Button>
					<Button
						key="public"
						disabled={isLoadingVacancy || isUpdating || isCreating}
						type="primary"
						onClick={() => handleOk()}
					>
						{vacancy?.data.status == prismaClient.TeamVacancyStatus.Published
							? t("Save")
							: t("Publish")}
					</Button>
				</Space>,
			]}
		>
			<Spin spinning={isLoadingVacancy}>
				<Form
					form={form}
					layout="vertical"
					variant="filled"
					name="vacancy-form"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{
						teamId,
					}}
				>
					<Row gutter={[16, 16]}>
						<Col flex={1}>
							<Form.Item
								label={t("The name of the vacancy")}
								name="title"
								rules={[{ required: true }]}
								required
								wrapperCol={{ span: 24 }}
							>
								<Input
									width={"100%"}
									placeholder={t(`For example: The concept of the environment`)}
								/>
							</Form.Item>
						</Col>
						<Col>
							<Form.Item
								name="finishedAt"
								label={t("Relevant to")}
								rules={[{ required: true }]}
								wrapperCol={{ span: 24 }}
							>
								<DatePicker
									format="DD.MM.YYYY"
									disabledDate={(current) =>
										current && current < dayjs().endOf("day")
									}
								/>
							</Form.Item>
						</Col>
					</Row>

					<Form.Item
						name="directionId"
						label={t("What direction does this vacancy belong")}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Select
							style={{ width: "100%" }}
							placeholder={t(`For example: 2D art and animation`)}
							options={directionsOptions}
						/>
					</Form.Item>

					<Form.Item
						name="description"
						label={t("Vacancy description")}
						tooltip={t(
							"modal.vacancy.descriptionHelp",
							"Describe the requirements/wishes for the candidate, describe the kaku a job he has to do",
						)}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={6}
							placeholder={t(
								"modal.vacancy.descriptionPlaceholder",
								`For example: I am looking for a concept designer from the environment that has experience at PC Projects, works in a realistic style.`,
							)}
						/>
					</Form.Item>

					{!showPromiseFields && (
						<Form.Item wrapperCol={{ span: 24 }}>
							<Popover
								content={
									adjustedMaxAvailableShare <= 0 ? t("No available equity") : ""
								}
								placement="topRight"
							>
								<Button
									type="text"
									disabled={adjustedMaxAvailableShare <= 0}
									icon={<MdOutlineHandshake />}
									onClick={() => setShowPromiseFields(true)}
								>
									{t("Add equity promise")}
								</Button>
							</Popover>
						</Form.Item>
					)}

					{!!showPromiseFields && (
						<Card
							className={styles.promiseCard}
							title={t("Equity Promise")}
							extra={
								<Popconfirm
									title={t("Remove equity promise")}
									placement="topRight"
									onConfirm={() => {
										form.setFieldsValue({
											promisePercentage: null,
											promiseStepId: null,
										});
										setShowPromiseFields(false);
									}}
								>
									<Button
										type="text"
										size="small"
										danger
										icon={<DeleteOutlined />}
										onClick={(e) => {
											e.stopPropagation();
										}}
									/>
								</Popconfirm>
							}
						>
							<Row gutter={[16, 16]}>
								<Col span={12}>
									<Form.Item
										name="promisePercentage"
										label={t("Promised equity percentage")}
										tooltip={t(
											"Percentage of equity that will be promised to the candidate",
										)}
										wrapperCol={{ span: 24 }}
										style={{ marginBottom: 0 }}
										rules={[{ required: true }]}
									>
										<InputNumber
											min={0}
											max={adjustedMaxAvailableShare}
											style={{ width: "100%", height: 40 }}
											placeholder={t("Enter percentage")}
										/>
									</Form.Item>
									{adjustedMaxAvailableShare > 0 && (
										<div
											style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}
										>
											{t("Maximum available equity")}:{" "}
											{adjustedMaxAvailableShare.toFixed(2)}%
										</div>
									)}
								</Col>
								<Col span={12}>
									<Form.Item
										name="promiseStepId"
										label={t("Required workflow step")}
										tooltip={t(
											"Step that needs to be completed to receive the promised equity",
										)}
										wrapperCol={{ span: 24 }}
										style={{ marginBottom: 0 }}
										rules={[{ required: true }]}
									>
										<Select
											style={{ width: "100%", height: 40 }}
											placeholder={t("Select step")}
											options={availableSteps}
											loading={isLoadingWorkflow}
										/>
									</Form.Item>
								</Col>
							</Row>
						</Card>
					)}
				</Form>
			</Spin>
		</Modal>
	);
};

export default VacancyModal;
