"use client";

import {
	IconExternalLink,
	IconFileCheck,
	IconInfoCircle,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Card,
	Divider,
	Flex,
	Form,
	Input,
	Radio,
	Typography,
} from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";
import {
	ClickwrapField,
	clickwrapFieldName,
	legalAcceptances,
	missingLegalCode,
	outdatedLegalCode,
} from "@/components/legal/ClickwrapField";
import { IconTile } from "@/components/ui";
import { LEGAL_DOCUMENTS } from "@/config/legal/registry";
import { ExpertInvoicing } from "@/config/prisma-enums";
import {
	isAccountRequired,
	type PaidWorkBody,
	useInvoicingLabels,
} from "@/hooks/payouts";
import type { CurationDto, PaidWorkDto } from "@/types/checkpoints";
import { AccountField } from "./AccountField";
import { CurationBlock } from "./CurationBlock";
import styles from "./style.module.scss";

const { Text } = Typography;

const TERMS = "AdvisorAgreement";

const PAYOUT_FIELDS = [
	"holder",
	"account",
	"invoicing",
	clickwrapFieldName(TERMS),
];

type Values = {
	holder: string;
	account?: string;
	invoicing: ExpertInvoicing;
	curationOn?: boolean;
	curationStages?: string[];
};

export type CurationBody = { on: boolean; stages: string[] };

export type PaidWorkSectionProps = {
	paidWork: PaidWorkDto;
	curation: CurationDto;
	saving?: boolean;
	askingAgain?: boolean;
	/** Rejects with the axios error; the section maps it onto its fields. */
	onSave: (body: PaidWorkBody) => Promise<unknown>;
	onSaveCuration: (body: CurationBody) => Promise<unknown>;
	onAskAgain: () => Promise<unknown>;
};

const sameStages = (a: string[], b: string[]) =>
	a.length === b.length && a.every((stage) => b.includes(stage));

/** Frames `Q8dNW0` / `SyTre` / `S5YkC` / `g9B7RS`: where an expert is paid and under which terms. */
export function PaidWorkSection({
	paidWork,
	curation,
	saving,
	askingAgain,
	onSave,
	onSaveCuration,
	onAskAgain,
}: PaidWorkSectionProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const invoicing = useInvoicingLabels();
	const [form] = Form.useForm();
	const [changing, setChanging] = useState(false);
	const [stale, setStale] = useState(false);

	const editingAccount = !paidWork.account || changing;
	const termsTitle = LEGAL_DOCUMENTS[TERMS].title;
	const termsRequired = t(
		"legal.clickwrap.AdvisorAgreement.paid-work",
		"You need to accept the Advisor Agreement to get paid",
	);
	const accountError = t(
		"advisor.settings.paid-work.account.error",
		"Enter a full IBAN or account number",
	);

	const invoicingOptions = [
		{
			value: ExpertInvoicing.SelfEmployed,
			title: invoicing.SelfEmployed,
			note: t(
				"advisor.settings.paid-work.invoicing.selfEmployed.note",
				"You invoice us from your registered individual activity.",
			),
		},
		{
			value: ExpertInvoicing.Company,
			title: invoicing.Company,
			note: t(
				"advisor.settings.paid-work.invoicing.company.note",
				"Your company invoices us.",
			),
		},
		{
			value: ExpertInvoicing.SelfBilling,
			title: invoicing.SelfBilling,
			note: t(
				"advisor.settings.paid-work.invoicing.selfBilling.note",
				"We issue the invoice on your behalf; you accept it.",
			),
		},
	];

	const keepAccount = () => {
		setChanging(false);
		form.setFields([{ name: "account", value: undefined, errors: [] }]);
	};

	const curationChanged = (values: Values) =>
		!curation.locked &&
		(!!values.curationOn !== curation.on ||
			!sameStages(values.curationStages ?? [], curation.stages));

	const saveCuration = async (values: Values) => {
		try {
			await onSaveCuration({
				on: !!values.curationOn,
				stages: values.curationStages ?? [],
			});
			return true;
		} catch {
			message.error(
				t(
					"advisor.settings.paid-work.curator.saveFailed",
					"Couldn't save project curation. Try again.",
				),
			);
			return false;
		}
	};

	const submit = async (values: Values) => {
		setStale(false);
		const withCuration = curationChanged(values);
		// One Save commits the card; untouched payout details are not re-sent for a curation change.
		if (withCuration && !form.isFieldsTouched(PAYOUT_FIELDS)) {
			if (await saveCuration(values))
				message.success(
					t(
						"advisor.settings.paid-work.curator.saved",
						"Project curation saved",
					),
				);
			return;
		}
		try {
			await onSave({
				holder: values.holder.trim(),
				account: editingAccount ? values.account?.trim() : undefined,
				invoicing: values.invoicing,
				legal: paidWork.termsNeeded ? legalAcceptances([TERMS]) : undefined,
			});
			setChanging(false);
			form.setFieldValue("account", undefined);
			if (withCuration && !(await saveCuration(values))) return;
			message.success(
				t("advisor.settings.paid-work.saved", "Payout details saved"),
			);
		} catch (error) {
			if (outdatedLegalCode(error)) {
				form.setFieldValue(clickwrapFieldName(TERMS), false);
				setStale(true);
				return;
			}
			if (missingLegalCode(error)) {
				form.setFields([
					{ name: clickwrapFieldName(TERMS), errors: [termsRequired] },
				]);
				return;
			}
			if (isAccountRequired(error)) {
				setChanging(true);
				form.setFields([{ name: "account", errors: [accountError] }]);
				return;
			}
			message.error(
				t(
					"advisor.settings.paid-work.saveFailed",
					"Couldn't save your payout details. Try again.",
				),
			);
		}
	};

	return (
		<Form
			form={form}
			layout="vertical"
			variant="filled"
			requiredMark={false}
			disabled={saving}
			scrollToFirstError={{ focus: true }}
			initialValues={{
				holder: paidWork.holder ?? "",
				invoicing: paidWork.invoicing ?? undefined,
				curationOn: curation.on,
				curationStages: curation.stages,
			}}
			onFinish={submit}
		>
			<Flex vertical gap={16}>
				<Card
					variant="borderless"
					title={t("advisor.settings.paid-work.title", "Paid work")}
				>
					<div className={styles.block}>
						<Text strong>
							{t("advisor.settings.paid-work.payout-details", "Payout details")}
						</Text>

						<Form.Item
							name="holder"
							label={t(
								"advisor.settings.paid-work.account-holder.label",
								"Account holder",
							)}
							extra={t(
								"advisor.settings.paid-work.account-holder.help",
								"Your name or your company's, as on your invoices. We pay only to an account in that name.",
							)}
							rules={[
								{
									validator: (_, value?: string) => {
										const length = value?.trim().length ?? 0;
										return length >= 2 && length <= 140
											? Promise.resolve()
											: Promise.reject(
													new Error(
														t(
															"advisor.settings.paid-work.account-holder.error",
															"Enter the account holder's name",
														),
													),
												);
									},
								},
							]}
							className={styles.item}
						>
							<Input maxLength={140} autoComplete="name" />
						</Form.Item>

						<AccountField
							editingAccount={editingAccount}
							paidWork={paidWork}
							keepAccount={keepAccount}
							accountError={accountError}
							changing={changing}
							setChanging={setChanging}
						/>

						<Form.Item
							name="invoicing"
							label={t(
								"advisor.settings.paid-work.invoicing.label",
								"How you invoice",
							)}
							rules={[
								{
									required: true,
									message: t(
										"advisor.settings.paid-work.invoicing.error",
										"Choose how you invoice",
									),
								},
							]}
							className={styles.item}
						>
							<Radio.Group
								orientation="vertical"
								className={styles.options}
								options={invoicingOptions.map((option) => ({
									value: option.value,
									label: (
										<Flex vertical gap={2}>
											<Text>{option.title}</Text>
											<Text type="secondary" className={styles.note}>
												{option.note}
											</Text>
										</Flex>
									),
								}))}
							/>
						</Form.Item>

						{paidWork.termsNeeded || !paidWork.terms ? (
							<ClickwrapField
								code={TERMS}
								stale={stale}
								requiredMessage={termsRequired}
							/>
						) : (
							<Flex align="center" gap={12}>
								<IconTile
									icon={IconFileCheck}
									tint="var(--gd-success-tint)"
									ink="var(--gd-success-on-tint)"
								/>
								<Flex vertical gap={2} className={styles.grow}>
									<Text className={styles.termsTitle}>{termsTitle}</Text>
									<Text type="secondary" className={styles.note}>
										{t(
											"advisor.settings.paid-work.terms-accepted",
											"Accepted on {date} · version {version}",
											{
												date: dayjs(paidWork.terms.acceptedAt).format(
													"D MMM YYYY",
												),
												version: paidWork.terms.version,
											},
										)}
									</Text>
								</Flex>
								<Link
									href={`/legal/${LEGAL_DOCUMENTS[TERMS].slug}/v${paidWork.terms.version}`}
									target="_blank"
									rel="noreferrer"
								>
									<Button
										icon={<IconExternalLink size={14} />}
										iconPlacement="end"
									>
										{t(
											"advisor.settings.paid-work.view-document",
											"View document",
										)}
									</Button>
								</Link>
							</Flex>
						)}

						<Flex gap={8}>
							<IconInfoCircle size={16} className={styles.noteIcon} />
							<Text type="secondary">
								{t(
									"advisor.settings.paid-work.payoutNote",
									"Paid by bank transfer in USD within 15 days after the month ends. Bank charges on your side are yours.",
								)}
							</Text>
						</Flex>
					</div>

					<Divider className={styles.divider} />
					<CurationBlock
						curation={curation}
						askingAgain={askingAgain}
						onAskAgain={onAskAgain}
					/>
				</Card>

				<Flex>
					<Button
						type="primary"
						htmlType="submit"
						loading={saving}
						disabled={false}
					>
						{t("common.save", "Save")}
					</Button>
				</Flex>
			</Flex>
		</Form>
	);
}
