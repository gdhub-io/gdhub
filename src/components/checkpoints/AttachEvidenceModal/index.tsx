"use client";

import {
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
	App,
	Button,
	Checkbox,
	Flex,
	Input,
	Modal,
	Radio,
	Segmented,
	Skeleton,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import CreateArtifactModal from "@/components/modals/CreateArtifactModal";
import { EmptyState, IconTile } from "@/components/ui";
import { CheckpointItemKind, ProjectArtifactType } from "@/config/prisma-enums";
import { useAttachEvidence } from "@/hooks/checkpoints";
import { useProjectArtifacts } from "@/hooks/project-artifacts";
import type { CheckpointArtifactRef, CheckpointDto } from "@/types/checkpoints";
import { useArtifactTypeLabel } from "../artifactType";
import styles from "./style.module.scss";

/**
 * The artifacts endpoint sends the whole row; `CheckpointArtifactRef` names only
 * the part the goal card needs. The meta line reads the rest where it is there.
 */
type PickableArtifact = CheckpointArtifactRef & {
	createdAt?: string;
	createdByUser?: { name: string | null } | null;
};

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

const artifactName = (artifact: CheckpointArtifactRef) =>
	artifact.name?.trim() || artifact.link;

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
	const typeLabel = useArtifactTypeLabel();
	const { message } = App.useApp();
	const queryClient = useQueryClient();

	const [face, setFace] = useState<"pick" | "add">("pick");
	const [search, setSearch] = useState("");
	const [artifactId, setArtifactId] = useState<string>();
	const [ticked, setTicked] = useState<string[]>([]);
	const [addOpen, setAddOpen] = useState(false);

	const { data, isLoading } = useProjectArtifacts(checkpoint.projectId);
	const attaching = useAttachEvidence(checkpoint.id);

	const artifacts: PickableArtifact[] = data ?? [];

	const query = search.trim().toLowerCase();
	const matched = query
		? artifacts.filter((artifact) =>
				[artifactName(artifact), typeLabel(artifact.type)].some((field) =>
					field.toLowerCase().includes(query),
				),
			)
		: artifacts;

	const outcomes = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome,
	);
	// A cut line is off the card; nothing can be proved against it any more.
	const provable = outcomes.filter((item) => !item.cut);

	const close = () => {
		setFace("pick");
		setSearch("");
		setArtifactId(undefined);
		setTicked([]);
		onClose();
	};

	const attach = async () => {
		if (!artifactId || !ticked.length) return;

		try {
			// Only the ticked lines are written, and only their `artifactId`: the
			// goal card's own history — a cut line, the day-14 wording, a curator's
			// note — has nothing to do with what just landed.
			await attaching.mutateAsync({ artifactId, itemIds: ticked });
			close();
		} catch {
			message.error(
				t("checkpoints.evidence.failed", "The evidence could not be attached"),
			);
		}
	};

	const picker = () => {
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
						value={artifactId}
						onChange={(event) => setArtifactId(event.target.value)}
					>
						{matched.map((artifact) => {
							const Icon = ICON[artifact.type];
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
										<IconTile icon={Icon} size="sm" />
										<Flex vertical gap={2} className={styles.rowBody}>
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
							loading={attaching.isPending}
							disabled={!artifactId || !ticked.length}
							onClick={attach}
						>
							{t("checkpoints.evidence.confirm", "Attach")}
						</Button>
					</Flex>
				</Flex>
			}
		>
			<Flex vertical gap={16} className={styles.body}>
				<Segmented
					block
					value={face}
					onChange={(value) => setFace(value as "pick" | "add")}
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
					picker()
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

				<div>
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
						<Typography.Paragraph
							type="secondary"
							className={styles.noOutcomes}
						>
							{t(
								"checkpoints.evidence.noOutcomes",
								"This checkpoint has no outcomes to prove yet.",
							)}
						</Typography.Paragraph>
					)}
				</div>
			</Flex>

			<CreateArtifactModal
				open={addOpen}
				projectId={checkpoint.projectId}
				onCancel={() => setAddOpen(false)}
				onCreate={() => {
					setAddOpen(false);
					setFace("pick");
					setSearch("");
					queryClient.invalidateQueries({
						queryKey: ["project-artifacts", checkpoint.projectId],
					});
				}}
			/>
		</Modal>
	);
}
