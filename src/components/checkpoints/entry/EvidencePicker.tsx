"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Modal } from "antd";
import { useState } from "react";
import {
	ArtifactPicker,
	type PickableArtifact,
} from "@/components/checkpoints/ArtifactPicker";
import { EvidenceSlot } from "@/components/checkpoints/EvidenceSlot";
import type { CheckpointArtifactRef } from "@/types/checkpoints";
import styles from "./EvidencePicker.module.scss";

export type EvidencePickerProps = {
	projectId?: string;
	value?: CheckpointArtifactRef | null;
	onChange?: (artifact: CheckpointArtifactRef | null) => void;
};

/**
 * One "done so far" line's proof: the slot is a button that opens the
 * project's artifact store (frame `IRJ2D` without the outcome checkboxes —
 * on the way in there are no outcomes yet), where a new file or link can be
 * added too.
 */
export function EvidencePicker({
	projectId,
	value,
	onChange,
}: EvidencePickerProps) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(false);
	const [picked, setPicked] = useState<PickableArtifact>();

	const close = () => {
		setPicked(undefined);
		setOpen(false);
	};

	const commit = (artifact: CheckpointArtifactRef | null) => {
		onChange?.(artifact);
		close();
	};

	return (
		<>
			<Button
				className={styles.slot}
				size="small"
				disabled={!projectId}
				onClick={() => setOpen(true)}
			>
				<EvidenceSlot artifact={value ?? null} plain />
			</Button>

			{projectId && (
				<Modal
					open={open}
					centered
					width={640}
					destroyOnHidden
					onCancel={close}
					title={t("checkpoints.evidence.attach", "Attach evidence")}
					footer={
						<Flex justify="space-between" gap={8}>
							{value ? (
								<Button type="text" onClick={() => commit(null)}>
									{t("checkpointEntry.evidence.detach", "Detach")}
								</Button>
							) : (
								<span />
							)}
							<Flex gap={8}>
								<Button onClick={close}>{t("common.cancel", "Cancel")}</Button>
								<Button
									type="primary"
									disabled={!picked}
									onClick={() => picked && commit(picked)}
								>
									{t("checkpoints.evidence.confirm", "Attach")}
								</Button>
							</Flex>
						</Flex>
					}
				>
					<ArtifactPicker
						projectId={projectId}
						value={picked?.id ?? value?.id}
						onChange={setPicked}
					/>
				</Modal>
			)}
		</>
	);
}
