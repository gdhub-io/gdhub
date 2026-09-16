"use client";

import { IconPaperclip, IconTrash } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Input, Tooltip } from "antd";
import { useState } from "react";
import { PickArtifactModal } from "@/components/checkpoints/PickArtifactModal";
import { useCurrentProject } from "@/hooks/project";
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

const emptyLine = (): GoalLine => ({
	key: crypto.randomUUID(),
	text: "",
	artifact: null,
});

export type GoalLinesProps = {
	lines: GoalLine[];
	/**
	 * The store as the step already loaded it. The picker reads the same query
	 * itself, so nothing is passed down any more — it stays only because the
	 * caller still hands it over.
	 */

	onChange: (lines: GoalLine[]) => void;
	placeholder: string;
	/** What an empty evidence slot says on this step. */
	/**
	 * Only the input side carries evidence: an outcome is proven at the end of
	 * the 28 days, so on day 1 there is nothing to attach to it.
	 */
	withEvidence?: boolean;
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
	onChange,
	placeholder,
	withEvidence,
	disabled,
}: GoalLinesProps) {
	const { t } = useTranslate();
	const { project } = useCurrentProject();
	// The line whose evidence is being picked, by key: an index would move under
	// the modal the moment a row above it is deleted.
	const [picking, setPicking] = useState<string>();

	const rows = [...lines, emptyLine()];

	const write = (index: number, patch: Partial<GoalLine>) => {
		const next = rows.map((row, position) =>
			position === index ? { ...row, ...patch } : row,
		);

		// The ghost row becomes real the moment it holds anything; trailing empty
		// rows never reach the server.
		onChange(next.filter((row) => row.text.trim() || row.artifact));
	};

	const writeByKey = (key: string, patch: Partial<GoalLine>) => {
		const index = rows.findIndex((row) => row.key === key);
		if (index >= 0) write(index, patch);
	};

	return (
		<>
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

							{/* One trailing control, as the frame draws it: the slot is what a
							    line is proven by, and pressing it is how that changes. */}
							{!isGhost && withEvidence && (
								<Tooltip
									title={
										line.artifact
											? t(
													"checkpoints.evidence.change",
													"Pick another artifact",
												)
											: undefined
									}
								>
									{/* One control, not a chip inside a button: the row's press
									    changes the evidence, and a link inside it would open the
									    artifact instead of doing what the row is for. */}
									<Button
										className={styles.attach}
										disabled={disabled}
										icon={
											line.artifact ? undefined : (
												<IconPaperclip size={16} stroke={1.6} />
											)
										}
										iconPosition="end"
										onClick={() => setPicking(line.key)}
									>
										{line.artifact ? (
											<EvidenceSlot artifact={line.artifact} plain />
										) : (
											t("checkpoints.evidence.attach", "Attach evidence")
										)}
									</Button>
								</Tooltip>
							)}

							{/* The ghost row is one control: nothing to prove, nothing to delete. */}
							{!isGhost && (
								<Button
									type="text"
									danger
									disabled={disabled}
									icon={<IconTrash size={16} />}
									aria-label={t(
										"checkpoints.goal.removeLine",
										"Remove the line",
									)}
									onClick={() =>
										onChange(lines.filter((_, position) => position !== index))
									}
								/>
							)}
						</Flex>
					);
				})}
			</Flex>

			{!!project?.id && (
				<PickArtifactModal
					open={!!picking}
					projectId={project.id}
					value={lines.find((line) => line.key === picking)?.artifact?.id}
					canDetach={!!lines.find((line) => line.key === picking)?.artifact}
					onClose={() => setPicking(undefined)}
					onPick={(artifact) =>
						picking && writeByKey(picking, { artifact: artifact ?? null })
					}
				/>
			)}
		</>
	);
}
