"use client";

import { IconRefresh } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Input, Modal, Typography } from "antd";
import { useState } from "react";
import { REGENERATE_HINT_MAX } from "@/config/checkpoint";
import {
	useJournalDraft,
	useReplaceJournalDraft,
} from "@/hooks/admin-checkpoints";
import type {
	CuratorJournalViewDto,
	JournalDraftDto,
	JournalDraftTarget,
} from "@/types/checkpoint-journal";
import { Message } from "./Conversation";
import styles from "./style.module.scss";

/**
 * GDHUB-156: an AI answer written again, or a step's input rebuilt, with an
 * optional hint. The draft stands next to the current answer until the admin
 * replaces it or keeps the current one; closing forgets it.
 */
export function RegenerateModal({
	checkpointId,
	view,
	target,
	onClose,
}: {
	checkpointId: string;
	view: CuratorJournalViewDto;
	target: JournalDraftTarget;
	onClose: () => void;
}) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [hint, setHint] = useState("");
	const [draft, setDraft] = useState<JournalDraftDto | null>(null);
	const generate = useJournalDraft(checkpointId);
	const replace = useReplaceJournalDraft(checkpointId);
	const rebuild = "step" in target;

	const onGenerate = () =>
		generate.mutate(
			{ target, hint },
			{
				onSuccess: setDraft,
				onError: () =>
					message.error(
						t(
							"admin.journal.regenerate.failed",
							"The AI could not write it again. Try once more, or close.",
						),
					),
			},
		);
	const onReplace = () =>
		draft &&
		replace.mutate(
			{ target, draftKey: draft.draftKey },
			{
				onSuccess: () => {
					message.success(t("admin.journal.regenerate.replaced", "Replaced"));
					onClose();
				},
				onError: () =>
					message.error(
						t(
							"admin.journal.regenerate.replaceFailed",
							"Not replaced: the draft expired or the step is no longer open.",
						),
					),
			},
		);

	return (
		<Modal
			open
			width={draft ? 1040 : 560}
			onCancel={onClose}
			title={
				rebuild
					? t("admin.journal.rebuild.title", "Rebuild the step's input")
					: t("admin.journal.regenerate.title", "Regenerate the answer")
			}
			footer={
				draft ? (
					<Flex gap={8} justify="end">
						<Button onClick={onClose}>
							{t("admin.journal.regenerate.keep", "Keep current")}
						</Button>
						<Button
							type="primary"
							loading={replace.isPending}
							onClick={onReplace}
						>
							{t("admin.journal.regenerate.replace", "Replace")}
						</Button>
					</Flex>
				) : (
					<Flex gap={8} justify="end">
						<Button onClick={onClose}>
							{t("admin.journal.regenerate.cancel", "Cancel")}
						</Button>
						<Button
							type="primary"
							icon={<IconRefresh size={16} />}
							loading={generate.isPending}
							onClick={onGenerate}
						>
							{t("admin.journal.regenerate.generate", "Generate")}
						</Button>
					</Flex>
				)
			}
		>
			{draft ? (
				<Flex vertical gap={24}>
					{hint.trim() && (
						<Typography.Text type="secondary">
							{t("admin.journal.history.hint", "Hint: {hint}", {
								hint: hint.trim(),
							})}
						</Typography.Text>
					)}
					{draft.changes.map((change) => (
						<Flex
							key={change.entryId ?? change.draft.id}
							gap={16}
							wrap
							className={styles.compare}
						>
							<Flex vertical gap={8} className={styles.compareSide}>
								<Typography.Text strong>
									{t("admin.journal.regenerate.current", "Current")}
								</Typography.Text>
								{change.current ? (
									<Message message={change.current} view={view} />
								) : (
									<Typography.Text type="secondary">
										{t(
											"admin.journal.regenerate.newLook",
											"Not looked at before",
										)}
									</Typography.Text>
								)}
							</Flex>
							<Flex vertical gap={8} className={styles.compareSide}>
								<Typography.Text strong>
									{t("admin.journal.regenerate.new", "New")}
								</Typography.Text>
								<Message message={change.draft} view={view} />
							</Flex>
						</Flex>
					))}
				</Flex>
			) : (
				<Flex vertical gap={8}>
					<Typography.Text type="secondary">
						{rebuild
							? t(
									"admin.journal.rebuild.explain",
									"The AI reads this step's artifacts, links and devlogs again, ignoring what it already saw, and writes the step's answers again. Nothing changes until you replace.",
								)
							: t(
									"admin.journal.regenerate.explain",
									"The AI writes this answer again from the same inputs. Nothing changes until you replace.",
								)}
					</Typography.Text>
					<Input.TextArea
						value={hint}
						onChange={(event) => setHint(event.target.value)}
						maxLength={REGENERATE_HINT_MAX}
						autoSize={{ minRows: 3, maxRows: 8 }}
						placeholder={t(
							"admin.journal.regenerate.hint",
							"Optional hint for the AI, e.g. “this is the concept document, read it all”",
						)}
					/>
				</Flex>
			)}
		</Modal>
	);
}
