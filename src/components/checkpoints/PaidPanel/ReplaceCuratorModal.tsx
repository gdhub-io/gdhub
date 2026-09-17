"use client";

import { useTranslate } from "@tolgee/react";
import { App, Flex, Modal, Typography } from "antd";
import { useState } from "react";
import { CuratorTable } from "@/components/checkpoints/start/CuratorTable";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { useUpdateCheckpoint } from "@/hooks/checkpoints";
import styles from "./style.module.scss";

export type ReplaceCuratorModalProps = {
	checkpointId: string;
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
	open,
	onClose,
}: ReplaceCuratorModalProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
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
			width={820}
			onCancel={onClose}
			onOk={replace}
			okButtonProps={{ disabled: !picked, loading: update.isPending }}
			okText={t("checkpoints.paid.replaceOk", "Hand it to them")}
			title={t("checkpoints.paid.replaceTitle", "Replace the curator")}
		>
			<Flex vertical gap={12}>
				<Typography.Text type="secondary" className={styles.body}>
					{t(
						"checkpoints.paid.replaceNote",
						"The 28 days will wait for whoever you pick. Nothing is charged again.",
					)}
				</Typography.Text>

				<CuratorTable value={picked} onChange={setPicked} />
			</Flex>
		</Modal>
	);
}
