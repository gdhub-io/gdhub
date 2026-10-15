"use client";

import { IconHistory, IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Form, Input, Typography } from "antd";
import {
	CHECKPOINT_DAYS,
	CHECKPOINT_ENTRY_ITEMS_MAX,
	CHECKPOINT_ITEM_TEXT_MAX,
} from "@/config/checkpoint";
import type { CheckpointArtifactRef } from "@/types/checkpoints";
import styles from "./DoneSoFar.module.scss";
import { EvidencePicker } from "./EvidencePicker";

/** One row as the form holds it; the artifact is kept whole so the slot can name it. */
export type DoneSoFarRow = {
	text: string;
	artifact: CheckpointArtifactRef | null;
};

export const DONE_SO_FAR_FIELD = "items";

export const EMPTY_DONE_ROW: DoneSoFarRow = { text: "", artifact: null };

export type DoneSoFarProps = {
	/** Whose artifact store the evidence comes from. */
	projectId?: string;
	/** The number of the checkpoint the rows were carried over from. */
	carriedFrom?: number | null;
};

/**
 * "What's done so far" (`FZPa3`, `ZG26o`): one to five things that exist
 * today, each with optional evidence. Rendered inside the page's `Form`, under
 * the `items` field. No box and no hairlines between the rows — it is a list of
 * inputs, not a table.
 */
export function DoneSoFar({ projectId, carriedFrom }: DoneSoFarProps) {
	const { t } = useTranslate();

	return (
		<Flex vertical gap={12}>
			<Flex vertical gap={4}>
				<Typography.Text className={styles.label}>
					{t("checkpointEntry.done.label", "What's done so far")}
				</Typography.Text>
				<Typography.Text className={styles.help}>
					{t(
						"checkpointEntry.done.help",
						"Up to {max} things that exist today — the curator measures the {days} days from here.",
						{ max: CHECKPOINT_ENTRY_ITEMS_MAX, days: CHECKPOINT_DAYS },
					)}
				</Typography.Text>
			</Flex>

			{!!carriedFrom && (
				<span className={styles.carried}>
					<IconHistory size={14} />
					<Typography.Text className={styles.carriedText}>
						{t(
							"checkpointEntry.done.carried",
							"Carried over from Checkpoint {number} — remove what no longer applies.",
							{ number: carriedFrom },
						)}
					</Typography.Text>
				</span>
			)}

			<Form.List name={DONE_SO_FAR_FIELD}>
				{(fields, { add, remove }) => (
					<Flex vertical gap={8} align="flex-start">
						<Flex vertical gap={8} className={styles.rows}>
							{fields.map((field) => (
								<div key={field.key} className={styles.row}>
									<Form.Item name={[field.name, "text"]} noStyle>
										<Input
											className={styles.text}
											variant="filled"
											maxLength={CHECKPOINT_ITEM_TEXT_MAX}
											placeholder={t(
												"checkpointEntry.done.placeholder",
												"e.g. a playable greybox, a design doc, sketches",
											)}
										/>
									</Form.Item>
									<Form.Item name={[field.name, "artifact"]} noStyle>
										<EvidencePicker projectId={projectId} />
									</Form.Item>
									{fields.length > 1 && (
										<Button
											type="text"
											danger
											className={styles.remove}
											aria-label={t("checkpointEntry.done.remove", "Remove")}
											icon={<IconTrash size={16} />}
											onClick={() => remove(field.name)}
										/>
									)}
								</div>
							))}
						</Flex>

						{fields.length < CHECKPOINT_ENTRY_ITEMS_MAX && (
							<Button
								type="text"
								icon={<IconPlus size={16} />}
								onClick={() => add({ ...EMPTY_DONE_ROW })}
							>
								{t("checkpointEntry.done.add", "Add item")}
							</Button>
						)}
					</Flex>
				)}
			</Form.List>
		</Flex>
	);
}
