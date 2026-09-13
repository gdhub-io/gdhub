"use client";

import { IconTrash } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Input } from "antd";
import { CHECKPOINT_ITEM_TEXT_MAX } from "@/schemas/checkpoint";
import type { CheckpointArtifactRef } from "@/types/checkpoints";
import { EvidenceSlot } from "../EvidenceSlot";
import styles from "./GoalLines.module.scss";

export type GoalLine = {
	/**
	 * Identity that survives an edit. A saved line uses its row id, a line added
	 * here a generated one, so deleting the second field does not remount the
	 * third and take the cursor with it.
	 */
	key: string;
	text: string;
	artifact: CheckpointArtifactRef | null;
};

export const emptyLine = (): GoalLine => ({
	key: crypto.randomUUID(),
	text: "",
	artifact: null,
});

export type GoalLinesProps = {
	lines: GoalLine[];
	artifacts: CheckpointArtifactRef[];
	onChange: (lines: GoalLine[]) => void;
	placeholder: string;
	/** What an empty evidence slot says on this step. */
	emptyEvidenceLabel?: string;
	disabled?: boolean;
};

/**
 * The answer column of steps 1 and 2 (frames `W76sA5`, `pyT9o`).
 *
 * The list always ends in one empty row rather than an "add" button: the next
 * line is written where the eye already is, and a button would put a press
 * between the author and the thing they came to type.
 */
export function GoalLines({
	lines,
	artifacts,
	onChange,
	placeholder,
	emptyEvidenceLabel,
	disabled,
}: GoalLinesProps) {
	const { t } = useTranslate();
	const rows = [...lines, emptyLine()];

	const write = (index: number, patch: Partial<GoalLine>) => {
		const next = rows.map((row, position) =>
			position === index ? { ...row, ...patch } : row,
		);

		// The ghost row becomes real the moment it holds anything; trailing empty
		// rows never reach the server.
		onChange(next.filter((row) => row.text.trim() || row.artifact));
	};

	return (
		<Flex vertical gap={8}>
			{rows.map((line, index) => {
				const isGhost = index === rows.length - 1;

				return (
					<Flex key={line.key} gap={8} align="center" className={styles.row}>
						<Input
							className={styles.input}
							value={line.text}
							maxLength={CHECKPOINT_ITEM_TEXT_MAX}
							variant="filled"
							disabled={disabled}
							placeholder={
								isGhost
									? t(
											"checkpoints.goal.ghostLine",
											"Add a line, then press Enter",
										)
									: placeholder
							}
							onChange={(event) => write(index, { text: event.target.value })}
						/>

						{!isGhost && (
							<EvidenceSlot
								artifact={line.artifact}
								options={artifacts}
								emptyLabel={emptyEvidenceLabel}
								disabled={disabled}
								onChange={(artifactId) =>
									write(index, {
										artifact:
											artifacts.find(
												(candidate) => candidate.id === artifactId,
											) ?? null,
									})
								}
							/>
						)}

						<Button
							type="text"
							danger={!isGhost}
							disabled={isGhost || disabled}
							icon={<IconTrash size={17} />}
							aria-label={t("checkpoints.goal.removeLine", "Remove the line")}
							onClick={() =>
								onChange(lines.filter((_, position) => position !== index))
							}
						/>
					</Flex>
				);
			})}
		</Flex>
	);
}
