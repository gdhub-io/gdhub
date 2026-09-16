"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Modal } from "antd";
import { useEffect, useState } from "react";
import {
	ArtifactPicker,
	type PickableArtifact,
} from "@/components/checkpoints/ArtifactPicker";

export type PickArtifactModalProps = {
	open: boolean;
	projectId: string;
	/** The chosen artifact, or nothing when the line is being let go of. */
	onPick: (artifact: PickableArtifact | undefined) => void;
	/** The artifact the line already holds, so the picker opens on it. */
	value?: string;
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
	value,
	canDetach,
	onClose,
}: PickArtifactModalProps) {
	const { t } = useTranslate();
	const [picked, setPicked] = useState<PickableArtifact>();
	const [selected, setSelected] = useState<string>();

	// Opening shows what the line already holds, so `Choose` is an agreement with
	// what is on screen rather than a dead button until something is clicked.
	useEffect(() => {
		if (open) {
			setSelected(value);
			setPicked(undefined);
		}
	}, [open, value]);

	const close = () => {
		setPicked(undefined);
		onClose();
	};

	// Nothing new was chosen: the line keeps what it had, and there is nothing to
	// write back.
	const choose = () => {
		if (picked) onPick(picked);
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
				// Taking the evidence off is not a step on the way to choosing, so it
				// sits apart from the pair that is.
				<Flex justify="space-between" gap={8}>
					<div>
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
					</div>
					<Flex gap={8}>
						<Button onClick={close}>{t("common.cancel", "Cancel")}</Button>
						<Button type="primary" disabled={!selected} onClick={choose}>
							{t("checkpoints.evidence.choose", "Choose")}
						</Button>
					</Flex>
				</Flex>
			}
		>
			<ArtifactPicker
				projectId={projectId}
				value={selected}
				onChange={(artifact) => {
					setPicked(artifact);
					setSelected(artifact?.id);
				}}
			/>
		</Modal>
	);
}
