import type { TeamVacancy } from "@gdhub-io/gdhub-prisma";
import { IconCashBanknote, IconHandStop, IconTrash } from "@tabler/icons-react";
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
	Tag,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { DirectionSelect } from "@/components/DirectionSelect";
import { TeamVacancyStatus } from "@/config/prisma-enums";
import { LISTING_WINDOW_DAYS } from "@/config/vacancy";
import { gtmEventTrigger } from "@/helpers/gtm";
import { useWorkDirections } from "@/hooks/library";
import { payListingFee } from "@/hooks/useListingFee";
import styles from "./style.module.scss";

// Display-only: the actual charge is the configured Paddle price.
const PAID_VACANCY_FEE = 9;

interface VacancyModalProps {
	teamId?: string;
	projectId?: string;
	projectSlug?: string;
	vacancyId?: string;
	open: boolean;
	onOk: () => void;
	onCancel: () => void;
}

const VacancyModal = ({
	teamId,
	projectId,
	projectSlug,
	vacancyId,
	open,
	onOk,
	onCancel,
}: VacancyModalProps) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const { options: directionsOptions } = useWorkDirections();
	const [showPromiseFields, setShowPromiseFields] = useState(false);
	const [showPaymentFields, setShowPaymentFields] = useState(false);

	const {
		data: vacancy,
		refetch: fetchVacancy,
		isFetching: isLoadingVacancy,
	} = useQuery({
		queryKey: ["vacancy", vacancyId],
		queryFn: () =>
			axios.get<TeamVacancy>("/api/user/project/vacancy", {
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
				setShowPaymentFields(
					!!(data as Record<string, unknown>)?.offeredAmount,
				);
			});
		}
	}, [open]);

	const handleFormValuesChange = () => {
		const offeredAmount = form.getFieldValue("offeredAmount");
		const offeredRateType = form.getFieldValue("offeredRateType");
		const hasOfferedComp = !!offeredAmount && !!offeredRateType;

		if (hasOfferedComp && !showPaymentFields) {
			setShowPaymentFields(true);
		}
	};

	const isPaidVacancy = showPaymentFields;
	const existingPayment = (vacancy?.data as Record<string, any>)?.payment;
	// Listing fee already settled → no need to send the user through checkout again.
	const isListingFeePaid = existingPayment?.status === "COMPLETED";

	// A listing can be valid for at most LISTING_WINDOW_DAYS from its publication
	// (set-once), so the date can be edited within that window but not extended
	// indefinitely. Falls back to creation time / now for not-yet-published ones.
	const vacancyData = vacancy?.data as Record<string, any> | undefined;
	const listingAnchor = vacancyData?.publishedAt
		? dayjs(vacancyData.publishedAt)
		: vacancyData?.createdAt
			? dayjs(vacancyData.createdAt)
			: dayjs();
	const maxFinishedDate = listingAnchor
		.add(LISTING_WINDOW_DAYS, "day")
		.endOf("day");

	const handleOk = async (asDraft?: { asDraft: boolean }) => {
		try {
			const formData = await form.validateFields();

			// "Paid vacancy" = it offers compensation, which requires the listing fee.
			const hasOfferedComp =
				isPaidVacancy && !!formData.offeredAmount && !!formData.offeredRateType;

			// The listing fee (Paddle checkout) is only required when publishing a
			// paid vacancy whose fee hasn't been settled yet. Drafts never charge.
			const needsCheckout = !asDraft && hasOfferedComp && !isListingFeePaid;

			const payload = {
				...formData,
				publishedAt: asDraft || needsCheckout ? null : dayjs().toISOString(),
				status:
					asDraft || needsCheckout
						? TeamVacancyStatus.Draft
						: TeamVacancyStatus.Published,
				teamId,
				promisePercentage: formData.promisePercentage || null,
				promiseStepId: formData.promiseStepId || null,
				// Offered compensation now lives on the vacancy (EUR; server stores cents).
				offeredAmount: formData.offeredAmount || null,
				offeredRateType: formData.offeredRateType || null,
			};

			let createdVacancyId = vacancyId;
			if (vacancyId) {
				await saveVacancy({ id: vacancyId, data: payload });
			} else {
				const response = await createVacancy(payload);
				createdVacancyId = response?.data?.id;
				gtmEventTrigger("vacancy_create", { teamId, title: formData.title });
			}

			// Ensure a listing-fee Payment exists for paid vacancies (drafts too), so
			// the fee can be charged on publish. The offered amount itself is already
			// stored on the vacancy above.
			if (createdVacancyId && hasOfferedComp) {
				const paymentResponse = await axios.post(
					"/api/user/project/vacancy/payment",
					{ vacancyId: createdVacancyId },
				);

				const paymentId = paymentResponse?.data?.id;

				if (needsCheckout && paymentId && projectSlug) {
					form.resetFields();
					setShowPromiseFields(false);
					setShowPaymentFields(false);
					onOk();

					try {
						const opened = await payListingFee({
							vacancyId: createdVacancyId,
							projectSlug,
						});
						// No Paddle price configured: the vacancy stays a saved draft.
						if (!opened) {
							message.warning(
								t(
									"modal.vacancy.paymentNotConfigured",
									"Payment is not configured yet. The position was saved as a draft.",
								),
							);
						}
					} catch (checkoutError) {
						console.error("Checkout failed:", checkoutError);
						message.error(t("Payment checkout failed. Please try again."));
					}
					return;
				}
			} else if (createdVacancyId && vacancyId && !hasOfferedComp) {
				// Editing and the payment block was removed → drop any pending payment.
				await axios.delete("/api/user/project/vacancy/payment", {
					params: { vacancyId: createdVacancyId },
				});
			}

			form.resetFields();
			setShowPromiseFields(false);
			setShowPaymentFields(false);
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
		setShowPaymentFields(false);
		onCancel();
	};

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

	return (
		<Modal
			centered
			className={styles.modal}
			title={vacancyId ? t("Change the position") : t("Create a new position")}
			width={800}
			destroyOnHidden
			mask={{ closable: false }}
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
						{vacancy?.data.status === TeamVacancyStatus.Published
							? t("Save")
							: isPaidVacancy && !isListingFeePaid
								? t("Pay & Publish")
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
					onValuesChange={handleFormValuesChange}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{
						teamId,
					}}
				>
					<Row gutter={[16, 16]}>
						<Col flex={1}>
							<Form.Item
								label={t("The name of the open position")}
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
										current &&
										(current < dayjs().endOf("day") ||
											current > maxFinishedDate)
									}
								/>
							</Form.Item>
						</Col>
					</Row>

					<Form.Item
						name="directionId"
						label={t("What direction does this open position belong")}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<DirectionSelect
							style={{ width: "100%" }}
							placeholder={t(`For example: 2D art and animation`)}
							options={directionsOptions ?? []}
						/>
					</Form.Item>

					<Form.Item
						name="description"
						label={t("modal.vacancy.description", "Open position description")}
						tooltip={t(
							"modal.vacancy.descriptionHelp",
							"Describe the requirements/wishes for the candidate, describe the kind of job he has to do",
						)}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={6}
							placeholder={t(
								"modal.vacancy.descriptionPlaceholder",
								`For example: I am looking for a concept designer from the environment that has experience at PC projects, works in a realistic style.`,
							)}
						/>
					</Form.Item>

					{(!showPromiseFields || !showPaymentFields) && (
						<Form.Item wrapperCol={{ span: 24 }}>
							<Space>
								{!showPromiseFields && (
									<Popover
										content={
											adjustedMaxAvailableShare <= 0
												? t("No available equity")
												: ""
										}
										placement="topRight"
									>
										<Button
											type="text"
											disabled={adjustedMaxAvailableShare <= 0}
											icon={<IconHandStop />}
											onClick={() => setShowPromiseFields(true)}
										>
											{t("Add equity promise")}
										</Button>
									</Popover>
								)}
								{!showPaymentFields && (
									<Button
										type="text"
										icon={<IconCashBanknote />}
										onClick={() => setShowPaymentFields(true)}
									>
										{t("Add payment")}
									</Button>
								)}
							</Space>
						</Form.Item>
					)}

					{showPaymentFields && (
						<Card
							className={styles.optionCard}
							title={t("Payment")}
							extra={
								isListingFeePaid ? (
									// The listing fee is already paid — it can't be removed,
									// so we show a paid badge instead of the delete button.
									// (The amount/rate can still be edited above.)
									<Tag color="green" style={{ marginInlineEnd: 0 }}>
										{t("vacancy.payment.status.COMPLETED", "Paid")}
									</Tag>
								) : (
									<Popconfirm
										title={t("Remove payment")}
										placement="topRight"
										onConfirm={() => {
											form.setFieldsValue({
												offeredAmount: null,
												offeredRateType: null,
											});
											setShowPaymentFields(false);
										}}
									>
										<Button
											type="text"
											size="small"
											danger
											icon={<IconTrash size={16} />}
											onClick={(e) => {
												e.stopPropagation();
											}}
										/>
									</Popconfirm>
								)
							}
						>
							<div
								style={{
									fontSize: 12,
									color: "var(--gd-color-text-secondary)",
									marginBottom: 16,
								}}
							>
								{t(
									"modal.vacancy.paymentNotice",
									`Paid positions require a listing fee of €${PAID_VACANCY_FEE} to publish.`,
								)}{" "}
								{t(
									"modal.vacancy.paymentRefundWindow",
									"The listing fee is refunded in full if you ask within 14 days of payment.",
								)}{" "}
								<a
									href="/legal/refund-policy"
									target="_blank"
									rel="noopener noreferrer"
								>
									{t("modal.vacancy.refundPolicyLink", "Refund policy")}
								</a>
							</div>
							<Row gutter={[16, 16]}>
								<Col span={12}>
									<Form.Item
										name="offeredAmount"
										label={t("Amount (EUR)")}
										wrapperCol={{ span: 24 }}
										style={{ marginBottom: 0 }}
										rules={[{ required: true }]}
									>
										<InputNumber
											min={1}
											prefix="€"
											style={{ width: "100%", height: 40 }}
											placeholder={t("Enter amount")}
										/>
									</Form.Item>
								</Col>
								<Col span={12}>
									<Form.Item
										name="offeredRateType"
										label={t("Rate type")}
										wrapperCol={{ span: 24 }}
										style={{ marginBottom: 0 }}
										rules={[{ required: true }]}
									>
										<Select
											style={{ width: "100%", height: 40 }}
											placeholder={t("Select rate type")}
											options={[
												{ label: t("Hourly"), value: "Hourly" },
												{ label: t("One-time"), value: "OneTime" },
												{ label: t("Monthly"), value: "Monthly" },
											]}
										/>
									</Form.Item>
								</Col>
							</Row>
						</Card>
					)}

					{!!showPromiseFields && (
						<Card
							className={styles.optionCard}
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
										icon={<IconTrash size={16} />}
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
											style={{
												fontSize: 12,
												color: "var(--gd-color-text-secondary)",
												marginTop: 4,
											}}
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
