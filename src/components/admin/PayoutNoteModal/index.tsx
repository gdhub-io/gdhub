"use client";

import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Input, Modal, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { StatusDot } from "@/components/ui";
import { PAYOUT_NOTE_MAX } from "@/config/checkpoint";
import { formatMoneyCents } from "@/config/checkpoint-pricing";
import { useSavePayoutNote } from "@/hooks/payouts";
import type { AdminPayoutRowDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

export type PayoutNoteModalProps = {
	row: AdminPayoutRowDto;
	/** The row's payout: the note belongs to it. */
	payout: NonNullable<AdminPayoutRowDto["payout"]>;
	/** The month's first day, UTC, as the list returns it. */
	month: string;
	onClose: () => void;
};

/** Frame 13.3c (`O33p7k`): the one thing about a paid payout that can change. */
export function PayoutNoteModal({
	row,
	payout,
	month,
	onClose,
}: PayoutNoteModalProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const save = useSavePayoutNote(payout.id);
	const initial = payout.note ?? "";
	const [note, setNote] = useState(initial);
	const label = t("admin.payouts.note.label", "Note");

	const submit = () =>
		save.mutate(note.trim(), {
			onSuccess: () => {
				message.success(t("admin.payouts.note.saved", "Note saved"));
				onClose();
			},
			onError: () =>
				message.error(
					t(
						"admin.payouts.note.saveFailed",
						"Couldn't save the note. Try again.",
					),
				),
		});

	return (
		<Modal
			open
			width={560}
			title={t("admin.payouts.note.title", "Note on {name}'s {month} payout", {
				name: row.name ?? "",
				month: dayjs.utc(month).format("MMMM"),
			})}
			onCancel={onClose}
			closable={!save.isPending}
			mask={{ closable: !save.isPending }}
			destroyOnHidden
			footer={
				<Flex justify="flex-end" gap={8}>
					<Button onClick={onClose} disabled={save.isPending}>
						{t("common.cancel", "Cancel")}
					</Button>
					<Button
						type="primary"
						onClick={submit}
						loading={save.isPending}
						// Clearing an existing note is a change: saving it removes the note.
						disabled={note.trim() === initial.trim()}
					>
						{t("admin.payouts.note.save", "Save")}
					</Button>
				</Flex>
			}
		>
			<Flex vertical gap={20}>
				<StatusDot
					tone="success"
					className={styles.paidLine}
					label={t(
						"admin.payouts.note.paidLine",
						"Paid {amount} on {date} · ref {reference}",
						{
							amount: formatMoneyCents(row.amount),
							date: dayjs.utc(payout.paidOn).format("D MMM"),
							reference: payout.reference,
						},
					)}
				/>

				<Flex vertical gap={8}>
					<Typography.Text>{label}</Typography.Text>
					<Input.TextArea
						aria-label={label}
						variant="filled"
						showCount
						maxLength={PAYOUT_NOTE_MAX}
						className={styles.counted}
						autoSize={{ minRows: 3, maxRows: 6 }}
						value={note}
						onChange={(event) => setNote(event.target.value)}
						disabled={save.isPending}
					/>
					<Typography.Text type="secondary">
						{t(
							"admin.payouts.note.help",
							"Only admins see it. The payout itself stays as it was.",
						)}
					</Typography.Text>
				</Flex>
			</Flex>
		</Modal>
	);
}
