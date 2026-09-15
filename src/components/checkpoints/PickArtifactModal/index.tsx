"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Modal } from "antd";
import { useState } from "react";
import {
	ArtifactPicker,
	type PickableArtifact,
} from "@/components/checkpoints/ArtifactPicker";

export type PickArtifactModalProps = {
	open: boolean;
	projectId: string;
	/** The chosen artifact, or nothing when the line is being let go of. */
	onPick: (artifact: PickableArtifact | undefined) => void;
	/** The line already has one: offer to take it off rather than replace it. */
	canDetach?: boolean;
	onClose: () => void;
};

/**
 * The picker with nothing behind it.
 *
 * A draft's goal card has no rows on the server yet, so its lines have no ids to
 * bind an artifact to — the choice is held by the step until it is left and
 * saved with the rest of the card. That is why this writes nothing and
 * `AttachEvidenceModal`, which works on a card that already exists, does.
 */
export function PickArtifactModal({
	open,
	projectId,
	onPick,
	canDetach,
	onClose,
}: PickArtifactModalProps) {
	const { t } = useTranslate();
	const [artifact, setArtifact] = useState<PickableArtifact>();

	const close = () => {
		setArtifact(undefined);
		onClose();
	};

	const choose = () => {
		if (!artifact) return;
		onPick(artifact);
		close();
	};

	return (
		<Modal
			open={open}
			centered
			width={640}
			onCancel={close}
			title={t("checkpoints.evidence.pickTitle", "Pick an artifact")}
			footer={
				<Flex justify="flex-end" gap={8}>
					{canDetach && (
						<Button
							danger
							onClick={() => {
								onPick(undefined);
								close();
							}}
						>
							{t("checkpoints.evidence.detach", "Detach it")}
						</Button>
					)}
					<Button onClick={close}>{t("common.cancel", "Cancel")}</Button>
					<Button type="primary" disabled={!artifact} onClick={choose}>
						{t("checkpoints.evidence.choose", "Choose")}
					</Button>
				</Flex>
			}
		>
			<ArtifactPicker
				projectId={projectId}
				value={artifact?.id}
				onChange={setArtifact}
			/>
		</Modal>
	);
}
