"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Form, Input } from "antd";
import { validPayoutAccount } from "@/lib/payout-account";
import type { PaidWorkDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

export function AccountField({
	editingAccount,
	paidWork,
	keepAccount,
	accountError,
	changing,
	setChanging,
}: {
	editingAccount: boolean;
	paidWork: PaidWorkDto;
	keepAccount: () => void;
	accountError: string;
	changing: boolean;
	setChanging: (changing: boolean) => void;
}) {
	const { t } = useTranslate();

	return editingAccount ? (
		<Form.Item
			name="account"
			label={t(
				"advisor.settings.paid-work.account.label",
				"IBAN or account number",
			)}
			extra={
				paidWork.account ? (
					<Flex justify="space-between" align="center" gap={12} wrap>
						<span>
							{t(
								"advisor.settings.paid-work.account.changeHelp",
								"The next payout goes to the new account.",
							)}
						</span>
						<Button
							type="link"
							onClick={keepAccount}
							className={styles.inlineLink}
						>
							{t("advisor.settings.paid-work.account.keep", "Keep {account}", {
								account: paidWork.account,
							})}
						</Button>
					</Flex>
				) : undefined
			}
			rules={[
				{
					validator: (_, value?: string) =>
						value && validPayoutAccount(value)
							? Promise.resolve()
							: Promise.reject(new Error(accountError)),
				},
			]}
			className={styles.item}
		>
			<Input
				autoFocus={changing}
				autoComplete="off"
				spellCheck={false}
				placeholder={
					paidWork.account
						? t(
								"advisor.settings.paid-work.account.placeholder",
								"New IBAN or account number",
							)
						: undefined
				}
			/>
		</Form.Item>
	) : (
		<Form.Item
			label={t(
				"advisor.settings.paid-work.account.label",
				"IBAN or account number",
			)}
			className={styles.item}
		>
			<Input
				readOnly
				value={paidWork.account ?? ""}
				className={styles.masked}
				suffix={
					<Button
						type="link"
						onClick={() => setChanging(true)}
						className={styles.inlineLink}
					>
						{t("advisor.settings.paid-work.account.change", "Change")}
					</Button>
				}
			/>
		</Form.Item>
	);
}
