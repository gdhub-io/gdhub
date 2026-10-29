"use client";

import { IconLock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Input, Radio, Tooltip, Typography } from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import { useState } from "react";
import {
	useVerdictCopy,
	VERDICT_ORDER,
	VERDICT_TONE,
} from "@/components/checkpoints/VerdictChip";
import { StatusDot } from "@/components/ui";
import { formatShort } from "@/components/WorkflowPath/dates";
import { VERDICT_NOTE_MAX } from "@/config/checkpoint";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import { CheckpointVerdict } from "@/config/prisma-enums";
import { useSaveVerdictDraft, useSendVerdict } from "@/hooks/checkpoints";
import {
	verdictDueBy,
	verdictSendOpensAt,
} from "@/lib/checkpoints/verdict-window";
import type {
	AdvisorCheckpointDto,
	VerdictContextDto,
} from "@/types/checkpoints";
import type { AdminVerdict } from ".";
import styles from "./style.module.scss";

const { Text } = Typography;

export function VerdictForm({
	checkpoint,
	context,
	stages,
	onSent,
	admin,
}: {
	checkpoint: AdvisorCheckpointDto;
	context: VerdictContextDto;
	stages: { from: string; to: string } | null;
	onSent: () => void;
	admin?: AdminVerdict;
}) {
	const { t } = useTranslate();
	const { message, modal } = App.useApp();
	const { label, meaning } = useVerdictCopy();
	// Mounted once the context is in, so the draft seeds the form exactly once.
	const [verdict, setVerdict] = useState<CheckpointVerdict | null>(
		context.draft?.verdict ?? null,
	);
	const [note, setNote] = useState(context.draft?.note ?? "");
	const saveDraft = useSaveVerdictDraft(checkpoint.id);
	const send = useSendVerdict(checkpoint.id);
	const sender = admin ?? { send: send.mutateAsync, sending: send.isPending };

	const isSend = !!admin || context.stage === "send";
	const ready = !!verdict && note.trim().length > 0;
	const options = VERDICT_ORDER.filter(
		(option) => option !== CheckpointVerdict.StageClosed || stages,
	);

	const sendOpens = checkpoint.startedAt
		? dayjs(verdictSendOpensAt(checkpoint.startedAt, context.finalCall)).format(
				"D MMM",
			)
		: null;
	const dueBy = context.dueAt
		? formatShort(verdictDueBy(context.dueAt).toISOString())
		: null;

	const save = () =>
		saveDraft.mutate(
			{ verdict, note },
			{
				onSuccess: () =>
					message.success(t("advisor.verdict.draftSaved", "Draft saved")),
				onError: () =>
					message.error(
						t("advisor.verdict.draftFailed", "The draft was not saved"),
					),
			},
		);

	const confirmSend = () => {
		if (!verdict) return;

		modal.confirm({
			title: t(
				"advisor.verdict.confirm",
				"Send the verdict? It cannot be edited afterwards.",
			),
			okText: t("advisor.verdict.send", "Send the verdict"),
			cancelText: t("common.cancel", "Cancel"),
			onOk: async () => {
				try {
					await sender.send({ verdict, note });
					message.success(t("advisor.verdict.sent", "The verdict is sent"));
					onSent();
				} catch {
					message.error(
						t("advisor.verdict.sendFailed", "The verdict was not sent"),
					);
				}
			},
		});
	};

	const lockedReason = !isSend
		? t(
				"advisor.verdict.sendLocked",
				"Sending opens when the final call starts on {date}.",
				{ date: sendOpens ?? "—" },
			)
		: !ready
			? t(
					"advisor.verdict.sendIncomplete",
					"Choose a verdict and write your reasoning first.",
				)
			: null;

	const sendButton = (
		<Tooltip title={lockedReason}>
			<Button
				type={isSend ? "primary" : "default"}
				className={clsx(isSend && styles.grow)}
				disabled={!!lockedReason}
				icon={lockedReason ? <IconLock size={16} /> : undefined}
				loading={sender.sending}
				onClick={confirmSend}
			>
				{admin?.missed?.refund
					? t(
							"admin.checkpoints.verdict.submitWithRefund",
							"Send verdict and refund {amount}",
							{ amount: formatCheckpointMoney(admin.missed.refund) },
						)
					: t("advisor.verdict.send", "Send the verdict")}
			</Button>
		</Tooltip>
	);

	const saveButton = (
		<Button
			type={isSend ? "default" : "primary"}
			className={clsx(!isSend && styles.grow)}
			loading={saveDraft.isPending}
			onClick={save}
		>
			{t("advisor.verdict.saveDraft", "Save draft")}
		</Button>
	);

	return (
		<Flex vertical gap={16}>
			<Radio.Group
				value={verdict}
				onChange={(event) => setVerdict(event.target.value)}
				className={styles.options}
			>
				{options.map((option) => (
					<Radio
						key={option}
						value={option}
						classNames={{
							root: clsx(styles.option, verdict === option && styles.selected),
							label: styles.optionBody,
						}}
					>
						<Flex vertical gap={8}>
							<StatusDot
								tone={VERDICT_TONE[option]}
								label={label(option)}
								className={styles.optionLabel}
							/>
							<Text type="secondary" className={styles.caption}>
								{meaning(option, stages ?? undefined)}
							</Text>
						</Flex>
					</Radio>
				))}
			</Radio.Group>

			<Flex vertical gap={8}>
				<Flex justify="space-between" align="center" gap={8}>
					<Text>{t("advisor.verdict.reasoning", "Your reasoning")}</Text>
					<Text className={styles.counter}>
						{t("advisor.verdict.counter", "required · {n} / {max}", {
							n: note.length,
							max: VERDICT_NOTE_MAX,
						})}
					</Text>
				</Flex>
				<Input.TextArea
					value={note}
					onChange={(event) => setNote(event.target.value)}
					maxLength={VERDICT_NOTE_MAX}
					autoSize={{ minRows: 6, maxRows: 14 }}
				/>
			</Flex>

			<Text className={styles.caption}>
				{isSend
					? t(
							"advisor.verdict.finalNote",
							"Sending is final: the verdict cannot be edited afterwards.",
						)
					: [
							context.draft &&
								t(
									"advisor.verdict.draftNote",
									"Draft saved · {when}. Only you see it.",
									{ when: dayjs(context.draft.savedAt).format("D MMM, HH:mm") },
								),
							t(
								"advisor.verdict.windowNote",
								"Sending opens when the final call starts on {opens}; the verdict is due by {due}.",
								{ opens: sendOpens ?? "—", due: dueBy ?? "—" },
							),
						]
							.filter(Boolean)
							.join(" ")}
			</Text>

			{admin && (
				<div className={styles.missed}>
					<Text type="secondary">
						{admin.missed?.refund
							? t(
									"admin.checkpoints.verdict.refundLine",
									"Calls the curator never joined are refunded",
								)
							: t(
									"admin.checkpoints.verdict.nothingToRefund",
									"Every call was held — nothing to refund",
								)}
					</Text>
					{!!admin.missed?.refund && (
						<Text strong className={styles.missedValue}>
							{t(
								"admin.checkpoints.verdict.refundValue",
								"{parts} of {total} parts · {amount}",
								{
									parts: admin.missed.parts - admin.missed.provided,
									total: admin.missed.parts,
									amount: formatCheckpointMoney(admin.missed.refund),
								},
							)}
						</Text>
					)}
				</div>
			)}

			<Flex gap={8}>
				{sendButton}
				{!admin && saveButton}
			</Flex>
		</Flex>
	);
}
