"use client";

import { useTranslate } from "@tolgee/react";
import { App, Button, Checkbox, Flex, Modal, Typography } from "antd";
import { useState } from "react";
import {
	ArtifactPicker,
	type PickableArtifact,
} from "@/components/checkpoints/ArtifactPicker";
import { CheckpointItemKind } from "@/config/prisma-enums";
import { useAttachEvidence } from "@/hooks/checkpoints";
import type { CheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

export type AttachEvidenceModalProps = {
	open: boolean;
	/** The card the evidence is bound to — its outcomes are the checkboxes. */
	checkpoint: CheckpointDto;
	onClose: () => void;
};

/**
 * Frame `IRJ2D`. One artifact, then the outcomes it proves — a list of
 * checkboxes rather than one choice, because a build can settle three lines at
 * once and asking for three attachments would only say the same thing slower.
 */
export function AttachEvidenceModal({
	open,
	checkpoint,
	onClose,
}: AttachEvidenceModalProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();

	const [artifact, setArtifact] = useState<PickableArtifact>();
	const [ticked, setTicked] = useState<string[]>([]);

	const attach = useAttachEvidence(checkpoint.id);

	// A cut line is off the card; nothing can be proved against it any more.
	const provable = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome && !item.cut,
	);

	const close = () => {
		setArtifact(undefined);
		setTicked([]);
		onClose();
	};

	const submit = async () => {
		if (!artifact || !ticked.length) return;

		try {
			await attach.mutateAsync({ artifactId: artifact.id, itemIds: ticked });
			close();
		} catch {
			message.error(
				t("checkpoints.evidence.failed", "The evidence could not be attached"),
			);
		}
	};

	return (
		<Modal
			open={open}
			centered
			width={640}
			onCancel={close}
			title={t("checkpoints.evidence.attach", "Attach evidence")}
			footer={
				<Flex align="center" justify="space-between" gap={12}>
					<Typography.Text type="secondary" className={styles.footerNote}>
						{t(
							"checkpoints.evidence.multi",
							"One artifact can prove more than one outcome.",
						)}
					</Typography.Text>
					<Flex gap={8}>
						<Button onClick={close}>{t("common.cancel", "Cancel")}</Button>
						<Button
							type="primary"
							loading={attach.isPending}
							disabled={!artifact || !ticked.length}
							onClick={submit}
						>
							{t("checkpoints.evidence.confirm", "Attach")}
						</Button>
					</Flex>
				</Flex>
			}
		>
			<ArtifactPicker
				projectId={checkpoint.projectId}
				value={artifact?.id}
				onChange={setArtifact}
			/>

			<div className={styles.proves}>
				<Typography.Text className={styles.label}>
					{t("checkpoints.evidence.whatItProves", "What it proves")}
				</Typography.Text>

				{provable.length ? (
					<Checkbox.Group
						className={styles.outcomes}
						value={ticked}
						onChange={(value) => setTicked(value as string[])}
					>
						{provable.map((line) => (
							<Checkbox
								key={line.id}
								value={line.id}
								className={styles.outcome}
							>
								{line.text}
							</Checkbox>
						))}
					</Checkbox.Group>
				) : (
					<Typography.Paragraph type="secondary" className={styles.noOutcomes}>
						{t(
							"checkpoints.evidence.noOutcomes",
							"This checkpoint has no outcomes to prove yet.",
						)}
					</Typography.Paragraph>
				)}
			</div>
		</Modal>
	);
}
