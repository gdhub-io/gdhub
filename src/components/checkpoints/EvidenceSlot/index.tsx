"use client";

import {
	IconFileText,
	IconPackage,
	IconPaperclip,
	IconPhoto,
	IconPlayerPlay,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Select, Tooltip, Typography } from "antd";
import { ProjectArtifactType } from "@/config/prisma-enums";
import type { CheckpointArtifactRef } from "@/types/checkpoints";
import styles from "./style.module.scss";

/**
 * The medium follows from the type, which is why there is one enum and not two:
 * a `GameplayVideo` is watched, an `ExecutableBuild` is read as the text of its
 * page and never run.
 */
const ICON = {
	[ProjectArtifactType.GameplayVideo]: IconPlayerPlay,
	[ProjectArtifactType.PrototypeVideo]: IconPlayerPlay,
	[ProjectArtifactType.ExecutableBuild]: IconPackage,
	[ProjectArtifactType.Art]: IconPhoto,
	[ProjectArtifactType.JDA]: IconFileText,
	[ProjectArtifactType.NDA]: IconFileText,
	[ProjectArtifactType.Concept]: IconFileText,
	[ProjectArtifactType.GDD]: IconFileText,
	[ProjectArtifactType.Other]: IconPaperclip,
} as const;

export type EvidenceSlotProps = {
	artifact: CheckpointArtifactRef | null;
	/** The project's artifacts, for the picker. Omit to render read-only. */
	options?: CheckpointArtifactRef[];
	onChange?: (artifactId: string | null) => void;
	/**
	 * What an empty slot says. Defaults to asking for proof where it can be
	 * given, and to saying there is none where it cannot.
	 */
	emptyLabel?: string;
	disabled?: boolean;
	/**
	 * Icon and name with no chrome of its own, for a slot that sits inside a
	 * control which already owns the border and the press.
	 */
	plain?: boolean;
};

const artifactLabel = (artifact: CheckpointArtifactRef) =>
	artifact.name?.trim() || artifact.link;

/**
 * One line's proof (component `vFBkk`).
 *
 * An outcome with nothing in this slot is an outcome that did not happen — the
 * slot is why nobody has to grade themselves at the end. On day 1 every outcome
 * slot is empty and names what it is owed, because that emptiness is the deal
 * being bought, not a defect to design away.
 */
export function EvidenceSlot({
	artifact,
	options,
	onChange,
	emptyLabel,
	disabled,
	plain,
}: EvidenceSlotProps) {
	const { t } = useTranslate();
	const readOnly = !options || !onChange;
	// A reader cannot attach anything, so an empty slot is a fact for them, not a
	// request: the curator must not be told to do the author's part.
	const empty =
		emptyLabel ??
		(readOnly
			? t("checkpoints.evidence.none", "Nothing attached")
			: t("checkpoints.evidence.attach", "Attach evidence"));

	if (plain) {
		const Icon = artifact ? ICON[artifact.type] : IconPaperclip;

		return (
			<span className={styles.plain}>
				<Icon size={14} stroke={1.6} />
				<Typography.Text className={styles.label} ellipsis>
					{artifact ? artifactLabel(artifact) : empty}
				</Typography.Text>
			</span>
		);
	}

	if (readOnly) {
		if (!artifact) {
			return (
				<span className={styles.slot} data-empty>
					<IconPaperclip size={14} stroke={1.6} />
					<Typography.Text className={styles.label}>{empty}</Typography.Text>
				</span>
			);
		}

		const Icon = ICON[artifact.type];

		return (
			<Tooltip title={artifactLabel(artifact)}>
				<a
					href={artifact.link}
					target="_blank"
					rel="noreferrer"
					className={styles.slot}
				>
					<Icon size={14} stroke={1.6} />
					<Typography.Text className={styles.label} ellipsis>
						{artifactLabel(artifact)}
					</Typography.Text>
				</a>
			</Tooltip>
		);
	}

	return (
		<Select
			className={styles.picker}
			variant="borderless"
			allowClear
			disabled={disabled}
			value={artifact?.id ?? undefined}
			onChange={(value) => onChange(value ?? null)}
			suffixIcon={<IconPaperclip size={14} stroke={1.6} />}
			placeholder={empty}
			options={options.map((option) => ({
				value: option.id,
				label: artifactLabel(option),
			}))}
		/>
	);
}
