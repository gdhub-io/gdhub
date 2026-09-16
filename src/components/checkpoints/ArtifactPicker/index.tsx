"use client";

import {
	type Icon,
	IconFileText,
	IconPackage,
	IconPaperclip,
	IconPhoto,
	IconPlayerPlay,
	IconPlus,
	IconSearch,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Flex,
	Input,
	Radio,
	Segmented,
	Skeleton,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import CreateArtifactModal from "@/components/modals/CreateArtifactModal";
import { EmptyState, IconTile } from "@/components/ui";
import { ProjectArtifactType } from "@/config/prisma-enums";
import { useProjectArtifacts } from "@/hooks/project-artifacts";
import type { CheckpointArtifactRef } from "@/types/checkpoints";
import styles from "./style.module.scss";

/**
 * The artifacts endpoint sends the whole row; `CheckpointArtifactRef` names only
 * the part the goal card needs. The meta line reads the rest where it is there.
 */
export type PickableArtifact = CheckpointArtifactRef & {
	createdAt?: string;
	createdByUser?: { name: string | null } | null;
};

/**
 * The medium follows from the type: a video is watched, a build is a package,
 * an agreement is read.
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

export const artifactIcon = (type: ProjectArtifactType): Icon => ICON[type];

/** A nameless artifact is shown by its link — never by an empty row. */
export const artifactName = (artifact: CheckpointArtifactRef) =>
	artifact.name?.trim() || artifact.link;

export type ArtifactPickerProps = {
	projectId: string;
	/** The chosen artifact's id; the picker itself holds no selection. */
	value?: string;
	onChange: (artifact: PickableArtifact | undefined) => void;
};

/**
 * One artifact out of the project's store, or a new one — the two faces of
 * frame `IRJ2D`.
 *
 * It hands back the artifact rather than its id: a caller that renders the
 * choice as a slot needs the name and the type, and looking them up again from
 * a list the picker already has is how two lists start to disagree.
 */
export function ArtifactPicker({
	projectId,
	value,
	onChange,
}: ArtifactPickerProps) {
	const { t } = useTranslate();
	const queryClient = useQueryClient();

	const [face, setFace] = useState<"pick" | "add">("pick");
	const [search, setSearch] = useState("");
	const [addOpen, setAddOpen] = useState(false);

	const { data, isLoading } = useProjectArtifacts(projectId);
	const artifacts: PickableArtifact[] = data ?? [];

	// Written out rather than mapped: the Tolgee extractor only sees literals.
	const typeLabel = (type: ProjectArtifactType) => {
		switch (type) {
			case ProjectArtifactType.GameplayVideo:
				return t("artifacts.type.gameplayVideo", "Gameplay video");
			case ProjectArtifactType.PrototypeVideo:
				return t("artifacts.type.prototypeVideo", "Prototype video");
			case ProjectArtifactType.ExecutableBuild:
				return t("artifacts.type.build", "Build");
			case ProjectArtifactType.Art:
				return t("artifacts.type.art", "Art");
			case ProjectArtifactType.JDA:
				return t("artifacts.type.jda", "Agreement");
			case ProjectArtifactType.NDA:
				return t("artifacts.type.nda", "NDA");
			case ProjectArtifactType.Concept:
				return t("artifacts.type.concept", "Concept document");
			case ProjectArtifactType.GDD:
				return t("artifacts.type.gdd", "Game design document");
			default:
				return t("artifacts.type.other", "Other");
		}
	};

	const query = search.trim().toLowerCase();
	const matched = query
		? artifacts.filter((artifact) =>
				[artifactName(artifact), typeLabel(artifact.type)].some((field) =>
					field.toLowerCase().includes(query),
				),
			)
		: artifacts;

	const store = () => {
		if (isLoading) return <Skeleton active paragraph={{ rows: 4 }} />;

		if (!artifacts.length)
			return (
				<EmptyState
					size="compact"
					icon={IconPaperclip}
					title={t("checkpoints.evidence.noArtifacts", "No artifacts yet")}
					description={t(
						"checkpoints.evidence.noArtifactsNote",
						"Evidence comes from the project's artifact store. Add the build, the video or the document and it appears here.",
					)}
					action={
						<Button
							type="primary"
							icon={<IconPlus size={16} stroke={2} />}
							onClick={() => setFace("add")}
						>
							{t("checkpoints.evidence.add", "Add a new one")}
						</Button>
					}
				/>
			);

		return (
			<>
				<Input
					variant="filled"
					allowClear
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					prefix={<IconSearch size={16} stroke={1.6} />}
					placeholder={t(
						"checkpoints.evidence.search",
						"Search the project's artifacts",
					)}
				/>

				{matched.length ? (
					<Radio.Group
						className={styles.list}
						value={value}
						onChange={(event) =>
							onChange(
								artifacts.find(
									(artifact) => artifact.id === event.target.value,
								),
							)
						}
					>
						{matched.map((artifact) => {
							const meta = [
								typeLabel(artifact.type),
								artifact.createdByUser?.name,
								artifact.createdAt
									? dayjs(artifact.createdAt).format("D MMM")
									: null,
							].filter(Boolean);

							return (
								<Radio
									key={artifact.id}
									value={artifact.id}
									className={styles.row}
								>
									<Flex align="center" gap={12}>
										<IconTile icon={artifactIcon(artifact.type)} size="sm" />
										<Flex vertical gap={4} className={styles.rowBody}>
											<Typography.Text className={styles.rowName} ellipsis>
												{artifactName(artifact)}
											</Typography.Text>
											<Typography.Text
												type="secondary"
												className={styles.rowMeta}
											>
												{meta.join(" · ")}
											</Typography.Text>
										</Flex>
									</Flex>
								</Radio>
							);
						})}
					</Radio.Group>
				) : (
					<Typography.Text type="secondary" className={styles.noMatch}>
						{t(
							"checkpoints.evidence.noMatch",
							"Nothing in the store matches that.",
						)}
					</Typography.Text>
				)}
			</>
		);
	};

	return (
		<Flex vertical gap={16} className={styles.picker}>
			<Segmented
				block
				value={face}
				onChange={(next) => setFace(next as "pick" | "add")}
				options={[
					{
						value: "pick",
						label: t("checkpoints.evidence.pick", "From this project"),
					},
					{
						value: "add",
						label: t("checkpoints.evidence.add", "Add a new one"),
					},
				]}
			/>

			{face === "pick" ? (
				store()
			) : (
				<EmptyState
					size="compact"
					icon={IconPlus}
					title={t("checkpoints.evidence.addTitle", "Add it to the project")}
					description={t(
						"checkpoints.evidence.addNote",
						"Artifacts live with the project, not with the checkpoint. Add it once and pick it here.",
					)}
					action={
						<Button type="primary" onClick={() => setAddOpen(true)}>
							{t("checkpoints.evidence.addCta", "Add artifact")}
						</Button>
					}
				/>
			)}

			<CreateArtifactModal
				open={addOpen}
				projectId={projectId}
				onCancel={() => setAddOpen(false)}
				onCreate={() => {
					setAddOpen(false);
					setFace("pick");
					setSearch("");
					queryClient.invalidateQueries({
						queryKey: ["project-artifacts", projectId],
					});
				}}
			/>
		</Flex>
	);
}
