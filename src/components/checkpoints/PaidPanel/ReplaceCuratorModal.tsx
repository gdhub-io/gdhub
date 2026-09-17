"use client";

import { useTranslate } from "@tolgee/react";
import { App, Flex, Modal, Radio, Typography } from "antd";
import { useState } from "react";
import { CuratorRow } from "@/components/checkpoints/start/CuratorRow";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import {
	useCheckpointCurators,
	useUpdateCheckpoint,
} from "@/hooks/checkpoints";
import type { CheckpointCurator } from "@/repositories/checkpoint-curators";
import styles from "./style.module.scss";

export type ReplaceCuratorModalProps = {
	checkpointId: string;
	open: boolean;
	onClose: () => void;
};

/**
 * Handing a paid checkpoint to somebody else.
 *
 * The same list the author picked from, and the same rows — a curator who reads
 * differently here would read as a different curator. Nothing is charged again:
 * the payment stays where it is and the checkpoint simply waits on whoever is
 * named next.
 */
export function ReplaceCuratorModal({
	checkpointId,
	open,
	onClose,
}: ReplaceCuratorModalProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const curators = useCheckpointCurators();
	const update = useUpdateCheckpoint(checkpointId);
	const [picked, setPicked] = useState<string>();

	const replace = async () => {
		if (!picked) return;

		try {
			await update.mutateAsync({
				curatorKind: CheckpointCuratorKind.Human,
				curatorId: picked,
			});
			onClose();
		} catch {
			message.error(t("checkpoints.goal.saveFailed", "Could not save"));
		}
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			onOk={replace}
			okButtonProps={{ disabled: !picked, loading: update.isPending }}
			okText={t("checkpoints.paid.replaceOk", "Hand it to them")}
			title={t("checkpoints.paid.replaceTitle", "Replace the curator")}
		>
			<Typography.Text type="secondary" className={styles.body}>
				{t(
					"checkpoints.paid.replaceNote",
					"The 28 days will wait for whoever you pick. Nothing is charged again.",
				)}
			</Typography.Text>

			<Radio.Group
				value={picked}
				onChange={(event) => setPicked(event.target.value)}
				className={styles.choices}
			>
				<Flex vertical>
					{(curators.data ?? []).map((row: CheckpointCurator) => (
						<Radio
							key={row.userId}
							value={row.userId}
							className={styles.choice}
						>
							<CuratorRow curator={row} />
						</Radio>
					))}
				</Flex>
			</Radio.Group>
		</Modal>
	);
}
