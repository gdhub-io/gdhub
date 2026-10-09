"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Input, Modal, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import {
	CHECKPOINT_ITEM_TEXT_MAX,
	CHECKPOINT_REVISION_NOTE_MAX,
} from "@/config/checkpoint";
import { CheckpointItemKind } from "@/config/prisma-enums";
import { useChangeScope } from "@/hooks/checkpoints";
import { CHECKPOINT_SCOPE_DAY } from "@/lib/checkpoint-scope";
import type { CheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

export type ScopeModalProps = {
	open: boolean;
	checkpoint: CheckpointDto;
	/** `keep` asks only for the reason: the list stands as it is. */
	mode: "change" | "keep";
	onClose: () => void;
};

/**
 * The day-15 answer — frame `Modal — Change the scope (day 15)`.
 *
 * Deleting a line is not offered. A smaller promise is recorded as a rewording
 * and a dropped one as a cut, both keeping the day-1 wording beside them, so a
 * closed checkpoint can still say what was bought. Leaving the list alone is a
 * decision too, and it is recorded with the same one line of why.
 */
export function ScopeModal({
	open,
	checkpoint,
	mode,
	onClose,
}: ScopeModalProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const change = useChangeScope(checkpoint.id);

	const outcomes = useMemo(
		() =>
			checkpoint.items.filter(
				(item) => item.kind === CheckpointItemKind.Outcome,
			),
		[checkpoint.items],
	);

	const [text, setText] = useState<Record<string, string>>({});
	const [cut, setCut] = useState<string[]>([]);
	const [added, setAdded] = useState<string[]>([]);
	const [note, setNote] = useState("");

	const close = () => {
		setText({});
		setCut([]);
		setAdded([]);
		setNote("");
		onClose();
	};

	const submit = async () => {
		const changes = outcomes.flatMap((item) => {
			const reworded = text[item.id]?.trim();
			const isCut = cut.includes(item.id);

			if (!isCut && (!reworded || reworded === item.text)) return [];

			return [
				{
					itemId: item.id,
					...(isCut && { cut: true }),
					...(reworded && reworded !== item.text && { text: reworded }),
				},
			];
		});

		try {
			await change.mutateAsync({
				note: note.trim(),
				changes: mode === "keep" ? [] : changes,
				added:
					mode === "keep"
						? []
						: added
								.map((line) => line.trim())
								.filter(Boolean)
								.map((line) => ({ text: line })),
			});
			close();
		} catch {
			message.error(
				t("checkpoints.scope.failed", "The change could not be saved"),
			);
		}
	};

	return (
		<Modal
			open={open}
			onCancel={close}
			width={680}
			title={
				mode === "keep"
					? t("checkpoints.scope.keepTitle", "Leave the list as it is")
					: t("checkpoints.scope.cta", "Change the outcomes")
			}
			okText={t("checkpoints.scope.confirm", "Record it")}
			cancelText={t("common.cancel", "Cancel")}
			okButtonProps={{ disabled: !note.trim(), loading: change.isPending }}
			onOk={submit}
		>
			<Flex vertical gap={16} className={styles.body}>
				<Typography.Text type="secondary">
					{mode === "keep"
						? t(
								"checkpoints.scope.keepNote",
								"The outcome list stands. Say why, and the decision is recorded beside it.",
							)
						: t(
								"checkpoints.scope.subtitle",
								"Update the scope on day {day}.",
								{ day: CHECKPOINT_SCOPE_DAY },
							)}
				</Typography.Text>

				{mode === "change" && (
					<Flex vertical gap={8}>
						{outcomes.map((item) => {
							const isCut = item.cut || cut.includes(item.id);

							return (
								<Flex key={item.id} gap={8} align="center">
									<Input
										variant="filled"
										value={text[item.id] ?? item.text}
										disabled={isCut}
										maxLength={CHECKPOINT_ITEM_TEXT_MAX}
										onChange={(event) =>
											setText((was) => ({
												...was,
												[item.id]: event.target.value,
											}))
										}
									/>
									{isCut ? (
										<Tag variant="filled" color="warning">
											{t("checkpoints.scope.chip.cut", "Comes off")}
										</Tag>
									) : (
										(text[item.id]?.trim() ?? item.text) !== item.text && (
											<Tag variant="filled">
												{t("checkpoints.scope.chip.reworded", "Reworded")}
											</Tag>
										)
									)}
									{!item.cut && (
										<Button
											type="text"
											icon={<IconTrash size={16} />}
											aria-label={t("checkpoints.scope.cut", "Cut the line")}
											onClick={() =>
												setCut((was) =>
													was.includes(item.id)
														? was.filter((one) => one !== item.id)
														: [...was, item.id],
												)
											}
										/>
									)}
								</Flex>
							);
						})}

						{added.map((line, index) => (
							<Flex key={`added-${index + 1}`} gap={8} align="center">
								<Input
									variant="filled"
									value={line}
									autoFocus
									maxLength={CHECKPOINT_ITEM_TEXT_MAX}
									placeholder={t(
										"checkpoints.goal.outcomePlaceholder",
										"A playable vertical slice",
									)}
									onChange={(event) =>
										setAdded((was) =>
											was.map((one, position) =>
												position === index ? event.target.value : one,
											),
										)
									}
								/>
								<Tag variant="filled" color="success">
									{t("checkpoints.scope.chip.added", "New")}
								</Tag>
							</Flex>
						))}

						<Button
							type="text"
							icon={<IconPlus size={15} />}
							className={styles.add}
							onClick={() => setAdded((was) => [...was, ""])}
						>
							{t("checkpoints.scope.add", "Add an outcome")}
						</Button>
					</Flex>
				)}

				<Flex vertical gap={8}>
					<Typography.Text>{t("checkpoints.scope.why", "Why")}</Typography.Text>
					<Input.TextArea
						variant="filled"
						value={note}
						rows={3}
						maxLength={CHECKPOINT_REVISION_NOTE_MAX}
						onChange={(event) => setNote(event.target.value)}
					/>
					<Typography.Text type="secondary" className={styles.hint}>
						{t(
							"checkpoints.scope.note",
							"The original scope remains in the checkpoint history.",
						)}
					</Typography.Text>
				</Flex>
			</Flex>
		</Modal>
	);
}
