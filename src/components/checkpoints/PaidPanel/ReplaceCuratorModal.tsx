"use client";

import { useTranslate } from "@tolgee/react";
import { App, Flex, Modal, Typography } from "antd";
import { useState } from "react";
import { CuratorTable } from "@/components/checkpoints/start/CuratorTable";
import { FirstCallPicker } from "@/components/checkpoints/start/FirstCallPicker";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { isSlotTaken } from "@/hooks/advisor-availability";
import {
	useCheckpointCurators,
	useUpdateCheckpoint,
} from "@/hooks/checkpoints";
import styles from "./style.module.scss";

export type ReplaceCuratorModalProps = {
	checkpointId: string;
	/** Whoever holds it now — they are not on the list of replacements. */
	currentCuratorId?: string | null;
	/** Everyone who already said they could not: shown, but not pickable. */
	unavailable?: string[];
	/** The price already held; nobody dearer or cheaper can take it over. */
	price?: number | null;
	/** The checkpoint's stage: only curators who curate it are listed. */
	stage?: string | null;
	open: boolean;
	onClose: () => void;
};

/**
 * Handing a paid checkpoint to somebody else.
 *
 * The same table the author picked from on step three, not a second list of the
 * same people: choosing the first time and choosing again are one decision, and
 * the price, the talent card and the record have to read the same both times.
 *
 * Nothing is charged again — the payment stays where it is and the checkpoint
 * waits on whoever is named next.
 */
export function ReplaceCuratorModal({
	checkpointId,
	currentCuratorId,
	unavailable,
	price,
	stage,
	open,
	onClose,
}: ReplaceCuratorModalProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const update = useUpdateCheckpoint(checkpointId);
	const curators = useCheckpointCurators(stage);
	const [picked, setPicked] = useState<string>();
	const [firstCall, setFirstCall] = useState<string | null>(null);
	const curator = curators.data?.find((row) => row.userId === picked);

	const replace = async () => {
		if (!picked || !firstCall) return;

		try {
			await update.mutateAsync({
				curatorKind: CheckpointCuratorKind.Human,
				curatorId: picked,
				startedAt: firstCall,
			});
			onClose();
		} catch (error) {
			if (isSlotTaken(error)) {
				setFirstCall(null);
				message.warning(
					t(
						"checkpoints.firstCall.taken",
						"That time was just taken. Pick another one.",
					),
				);
				return;
			}
			message.error(t("checkpoints.goal.saveFailed", "Could not save"));
		}
	};

	return (
		<Modal
			open={open}
			width={820}
			onCancel={onClose}
			onOk={replace}
			okButtonProps={{
				disabled: !picked || !firstCall,
				loading: update.isPending,
			}}
			okText={t("checkpoints.paid.replaceOk", "Hand it to them")}
			title={t("checkpoints.paid.replaceTitle", "Replace the curator")}
		>
			<Flex vertical gap={12}>
				<Typography.Text type="secondary" className={styles.body}>
					{t(
						"checkpoints.paid.replaceNoteFirstCall",
						"The 28 days will wait for whoever you pick, from the first call you book with them. Nothing is charged again.",
					)}{" "}
					{price != null &&
						t(
							"checkpoints.paid.replaceSamePrice",
							"Only experts at the price you reserved are listed.",
						)}
				</Typography.Text>

				<CuratorTable
					value={picked}
					onChange={(userId) => {
						setPicked(userId);
						setFirstCall(null);
					}}
					exclude={currentCuratorId}
					unavailable={unavailable}
					price={price}
					stage={stage}
				/>

				{curator && (
					<FirstCallPicker
						key={curator.userId}
						curatorId={curator.userId}
						curatorName={curator.name.split(" ")[0]}
						earliest={curator.firstCallFrom}
						value={firstCall}
						onChange={setFirstCall}
					/>
				)}
			</Flex>
		</Modal>
	);
}
