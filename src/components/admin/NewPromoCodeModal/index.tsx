"use client";

import { useTranslate } from "@tolgee/react";
import {
	App,
	Checkbox,
	DatePicker,
	Flex,
	Form,
	Input,
	InputNumber,
	Modal,
	Segmented,
	Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { CHECKPOINT_PRICE_CURRENCY } from "@/config/checkpoint";
import {
	isPromoCodeTaken,
	useCreatePromoCode,
} from "@/hooks/admin-promo-codes";
import type { NewPromoCode } from "@/types/checkpoints";
import styles from "./style.module.scss";

type Values = {
	code: string;
	kind: NewPromoCode["kind"];
	value: number;
	expiresAt: Dayjs | null;
	maxRedemptions: number | null;
	firstPurchaseOnly: boolean;
};

const INITIAL_VALUES: Partial<Values> = {
	kind: "percent",
	expiresAt: null,
	maxRedemptions: null,
	firstPurchaseOnly: false,
};

/** Stripe's own limit on a customer-facing code is wider; the API holds it to this. */
const CODE_PATTERN = /^[A-Z0-9]{3,24}$/;

/** Creates a Stripe promotion code for checkpoint purchases. */
export function NewPromoCodeModal({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [form] = Form.useForm<Values>();
	const kind = Form.useWatch("kind", form) ?? "percent";
	const create = useCreatePromoCode();

	const submit = (values: Values) =>
		create.mutate(
			{
				code: values.code,
				kind: values.kind,
				value: values.value,
				// The code works through the whole of the chosen day.
				expiresAt: values.expiresAt
					? values.expiresAt.endOf("day").toISOString()
					: null,
				maxRedemptions: values.maxRedemptions ?? null,
				firstPurchaseOnly: values.firstPurchaseOnly,
			},
			{
				onSuccess: () => {
					message.success(
						t("admin.checkpoints.promoCodes.created", "Promo code created"),
					);
					onClose();
				},
				onError: (error) => {
					if (isPromoCodeTaken(error)) {
						form.setFields([
							{
								name: "code",
								errors: [
									t(
										"admin.checkpoints.promoCodes.form.code.taken",
										"This code already exists in Stripe. Pick another.",
									),
								],
							},
						]);
						return;
					}
					message.error(
						t(
							"admin.checkpoints.promoCodes.createFailed",
							"Couldn't create the code. Try again.",
						),
					);
				},
			},
		);

	const optional = (
		<Typography.Text type="secondary">
			{t("admin.checkpoints.promoCodes.form.optional", "(optional)")}
		</Typography.Text>
	);

	return (
		<Modal
			open={open}
			title={t("admin.checkpoints.promoCodes.modal.title", "New promo code")}
			okText={t("admin.checkpoints.promoCodes.modal.submit", "Create code")}
			cancelText={t("common.cancel", "Cancel")}
			confirmLoading={create.isPending}
			onOk={() => form.submit()}
			onCancel={onClose}
			destroyOnHidden
		>
			<Form<Values>
				form={form}
				layout="vertical"
				variant="filled"
				initialValues={INITIAL_VALUES}
				requiredMark={false}
				onFinish={submit}
			>
				<Form.Item
					name="code"
					label={t("admin.checkpoints.promoCodes.form.code.label", "Code")}
					extra={t(
						"admin.checkpoints.promoCodes.form.code.help",
						"Letters and digits; what the buyer types",
					)}
					normalize={(value?: string) => value?.toUpperCase()}
					rules={[
						{
							required: true,
							pattern: CODE_PATTERN,
							message: t(
								"admin.checkpoints.promoCodes.form.code.invalid",
								"3 to 24 letters and digits.",
							),
						},
					]}
				>
					<Input maxLength={24} autoComplete="off" placeholder="LAUNCH30" />
				</Form.Item>

				<Form.Item
					label={t(
						"admin.checkpoints.promoCodes.form.discount.label",
						"Discount",
					)}
					extra={
						kind === "percent"
							? t(
									"admin.checkpoints.promoCodes.form.discount.helpPercent",
									"Up to 99%: a free checkpoint is given by an administrator, not by a code.",
								)
							: t(
									"admin.checkpoints.promoCodes.form.discount.helpAmount",
									"Less than the checkpoint price: a free checkpoint is given by an administrator, not by a code.",
								)
					}
				>
					<Flex gap="small">
						<Form.Item name="kind" noStyle>
							<Segmented
								options={[
									{
										value: "percent",
										label: t(
											"admin.checkpoints.promoCodes.form.discount.percent",
											"Percent",
										),
									},
									{
										value: "amount",
										label: t(
											"admin.checkpoints.promoCodes.form.discount.amount",
											"Amount",
										),
									},
								]}
							/>
						</Form.Item>
						<Form.Item
							name="value"
							noStyle
							rules={[
								{
									required: true,
									message: t(
										"admin.checkpoints.promoCodes.form.discount.required",
										"Enter the discount.",
									),
								},
							]}
						>
							<InputNumber
								className={styles.grow}
								min={1}
								max={kind === "percent" ? 99 : undefined}
								precision={0}
								suffix={kind === "percent" ? "%" : undefined}
								prefix={
									kind === "amount" ? CHECKPOINT_PRICE_CURRENCY : undefined
								}
							/>
						</Form.Item>
					</Flex>
				</Form.Item>

				<Form.Item
					name="expiresAt"
					label={
						<>
							{t("admin.checkpoints.promoCodes.form.expires.label", "Expires")}
							&nbsp;{optional}
						</>
					}
				>
					<DatePicker
						className={styles.full}
						format="ll"
						disabledDate={(date) => date.isBefore(dayjs(), "day")}
						placeholder={t(
							"admin.checkpoints.promoCodes.form.expires.placeholder",
							"No end date",
						)}
					/>
				</Form.Item>

				<Form.Item
					name="maxRedemptions"
					label={
						<>
							{t("admin.checkpoints.promoCodes.form.maxUses.label", "Max uses")}
							&nbsp;{optional}
						</>
					}
				>
					<InputNumber
						className={styles.full}
						min={1}
						precision={0}
						placeholder={t(
							"admin.checkpoints.promoCodes.form.maxUses.placeholder",
							"Unlimited",
						)}
					/>
				</Form.Item>

				<Form.Item name="firstPurchaseOnly" valuePropName="checked">
					<Checkbox>
						{t(
							"admin.checkpoints.promoCodes.form.firstPurchase",
							"First purchase only",
						)}
					</Checkbox>
				</Form.Item>
			</Form>
		</Modal>
	);
}
