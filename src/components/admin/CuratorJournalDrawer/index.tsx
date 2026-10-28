"use client";

import {
	type Icon,
	IconFileCheck,
	IconGavel,
	IconMessage,
	IconPackage,
	IconPhoto,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Collapse,
	Descriptions,
	Drawer,
	Flex,
	Segmented,
	Skeleton,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { type ReactNode, useState } from "react";
import { EvidenceMatchTag } from "@/components/checkpoints/EvidenceMatchTag";
import { VerdictChip } from "@/components/checkpoints/VerdictChip";
import { IconTile } from "@/components/ui";
import { formatMoneyCents } from "@/config/checkpoint-pricing";
import {
	CheckpointJournalKind,
	type CheckpointVerdict,
	type EvidenceMatch,
} from "@/config/prisma-enums";
import { useCuratorJournal } from "@/hooks/admin-checkpoints";
import type { JournalRead as Read } from "@/repositories/evidence-seen";
import type {
	AdminCheckpointRowDto,
	CuratorJournalEntryDto,
} from "@/types/checkpoints";
import styles from "./style.module.scss";

type Judged = { match: EvidenceMatch; note: string | null };
type Verdict = {
	/** The AI's line (its verdict, or its read for a human curator) or the curator's own. */
	by: "ai" | "curator";
	proposed: CheckpointVerdict | null;
	/** Null on the AI's read of a human checkpoint, until the curator sends theirs. */
	settled: CheckpointVerdict | null;
	overrode?: CheckpointVerdict | null;
	unproven?: unknown[];
	note?: string;
};

type Filter = "all" | CheckpointJournalKind;

const ICON: Record<CheckpointJournalKind, Icon> = {
	[CheckpointJournalKind.Evidence]: IconFileCheck,
	[CheckpointJournalKind.DevlogMedia]: IconPhoto,
	[CheckpointJournalKind.Artifact]: IconPackage,
	[CheckpointJournalKind.Review]: IconMessage,
	[CheckpointJournalKind.Verdict]: IconGavel,
};

const looked = (entry: CuratorJournalEntryDto) =>
	entry.kind === CheckpointJournalKind.Evidence ||
	entry.kind === CheckpointJournalKind.DevlogMedia ||
	entry.kind === CheckpointJournalKind.Artifact;

const unreadOf = (read: Read) => !read.text && !read.images;

/** Frame 11.10: the AI curator's journal of one checkpoint, for admins. */
export function CuratorJournalDrawer({
	checkpoint,
	onClose,
}: {
	checkpoint: AdminCheckpointRowDto;
	onClose: () => void;
}) {
	const { t } = useTranslate();
	const journal = useCuratorJournal(checkpoint.id);
	const [filter, setFilter] = useState<Filter>("all");

	const entries = journal.data ?? [];
	const reads = entries.filter(looked).map((entry) => entry.input as Read);
	const shown = entries.filter(
		(entry) => filter === "all" || entry.kind === filter,
	);
	const sprints = [...new Set(shown.map((entry) => entry.sprint))];

	return (
		<Drawer
			open
			size={640}
			onClose={onClose}
			title={
				<Flex vertical gap={4}>
					{t("admin.checkpoints.journal.title", "Curator journal")}
					<Typography.Text type="secondary" className={styles.subtitle}>
						{checkpoint.projectName} ·{" "}
						{t("admin.checkpoints.journal.checkpoint", "Checkpoint {number}", {
							number: checkpoint.number,
						})}{" "}
						· {checkpoint.stageName}
					</Typography.Text>
				</Flex>
			}
		>
			{journal.isLoading ? (
				<Skeleton active avatar paragraph={{ rows: 2 }} />
			) : journal.isError ? (
				<Typography.Text type="secondary">
					{t(
						"admin.checkpoints.journal.error",
						"The journal could not be loaded. Close it and open it again.",
					)}
				</Typography.Text>
			) : !entries.length ? (
				<Typography.Text type="secondary">
					{t(
						"admin.checkpoints.journal.empty",
						"Nothing looked at yet. Entries appear as artifacts are attached and devlogs are posted.",
					)}
				</Typography.Text>
			) : (
				<Flex vertical gap={24}>
					<Descriptions
						colon={false}
						size="small"
						column={3}
						layout="vertical"
						items={[
							{
								key: "looked",
								label: t("admin.checkpoints.journal.looked", "Looked at"),
								children: t(
									"admin.checkpoints.journal.lookedValue",
									"{links} links · {unread} not read",
									{
										links: reads.length,
										unread: reads.filter(unreadOf).length,
									},
								),
							},
							{
								key: "video",
								label: t("admin.checkpoints.journal.video", "Video watched"),
								children: t(
									"admin.checkpoints.journal.seconds",
									"{seconds} s",
									{
										seconds: Math.round(
											reads.reduce((sum, read) => sum + read.videoSeconds, 0),
										),
									},
								),
							},
							{
								key: "spend",
								label: t("admin.checkpoints.journal.spend", "AI spend"),
								children: formatMoneyCents(checkpoint.aiCost),
							},
						]}
					/>
					<Segmented<Filter>
						value={filter}
						onChange={setFilter}
						options={[
							{
								value: "all",
								label: t("admin.checkpoints.journal.all", "All"),
							},
							{
								value: CheckpointJournalKind.Evidence,
								label: t("admin.checkpoints.journal.artifacts", "Artifacts"),
							},
							{
								value: CheckpointJournalKind.DevlogMedia,
								label: t("admin.checkpoints.journal.media", "Devlog media"),
							},
							{
								value: CheckpointJournalKind.Review,
								label: t("admin.checkpoints.journal.reviews", "Reviews"),
							},
							{
								value: CheckpointJournalKind.Verdict,
								label: t("admin.checkpoints.journal.verdict", "Verdict"),
							},
						]}
					/>
					{sprints.map((sprint) => (
						<Flex key={sprint ?? "none"} vertical>
							<Typography.Text
								type="secondary"
								strong
								className={styles.sprint}
							>
								{sprint
									? t("admin.checkpoints.journal.sprint", "Sprint {sprint}", {
											sprint,
										})
									: t("admin.checkpoints.journal.noSprint", "Before a sprint")}
							</Typography.Text>
							{shown
								.filter((entry) => entry.sprint === sprint)
								.map((entry) => (
									<JournalEntry key={entry.id} entry={entry} />
								))}
						</Flex>
					))}
				</Flex>
			)}
		</Drawer>
	);
}

function JournalEntry({ entry }: { entry: CuratorJournalEntryDto }) {
	const { t } = useTranslate();
	const read = entry.input as Read;

	// Only a look at a link has an input to show; reviews and verdicts bring their own.
	const whatWasRead = () => (
		<Descriptions
			colon={false}
			size="small"
			column={1}
			items={[
				{
					key: "opened",
					label: t("admin.checkpoints.journal.opened", "Opened"),
					children: read.opened,
				},
				{
					key: "sent",
					label: t("admin.checkpoints.journal.sent", "Sent to the AI"),
					children: t(
						"admin.checkpoints.journal.sentValue",
						"{chars} characters of text · {images} images · {seconds} s of video",
						{
							chars: read.text?.length ?? 0,
							images: read.images,
							seconds: Math.round(read.videoSeconds),
						},
					),
				},
				{
					key: "unread",
					label: t("admin.checkpoints.journal.notRead", "Not read"),
					children: read.unread ?? "—",
				},
				...(read.text
					? [
							{
								key: "text",
								label: t("admin.checkpoints.journal.text", "Text"),
								children: (
									<Typography.Paragraph type="secondary" className={styles.pre}>
										{read.text}
									</Typography.Paragraph>
								),
							},
						]
					: []),
			]}
		/>
	);
	const raw = (
		<Typography.Paragraph type="secondary" className={styles.pre}>
			{JSON.stringify({ input: entry.input, output: entry.output }, null, 2)}
		</Typography.Paragraph>
	);

	const view = (): {
		title: string;
		tag?: ReactNode;
		body: ReactNode;
		/** A look at a link opens on what was read. */
		more?: { label: string; content: ReactNode };
	} => {
		switch (entry.kind) {
			case CheckpointJournalKind.Evidence: {
				const judged = entry.output as Judged;
				return {
					title: t("admin.checkpoints.journal.artifact", "Artifact · {name}", {
						name: read.artifactName ?? read.task,
					}),
					tag: <EvidenceMatchTag match={judged.match} />,
					body: t(
						"admin.checkpoints.journal.artifactBody",
						"Task: “{task}”. Seen: {note}",
						{ task: read.task, note: judged.note ?? "—" },
					),
				};
			}
			case CheckpointJournalKind.DevlogMedia: {
				const { shows } = entry.output as { shows: string | null };
				return {
					title: t(
						"admin.checkpoints.journal.devlog",
						"Devlog media · {devlog}",
						{
							devlog: read.devlog,
						},
					),
					body:
						shows ??
						t("admin.checkpoints.journal.unread", "Not read — {why}", {
							why: read.unread,
						}),
				};
			}
			case CheckpointJournalKind.Artifact: {
				const { shows } = entry.output as { shows: string | null };
				return {
					title: t(
						"admin.checkpoints.journal.sprintArtifact",
						"Sprint artifact · {name}",
						{ name: read.artifactName ?? read.artifactType ?? "" },
					),
					body:
						shows ??
						t("admin.checkpoints.journal.unread", "Not read — {why}", {
							why: read.unread,
						}),
				};
			}
			case CheckpointJournalKind.Review: {
				const output = entry.output as {
					audience?: "curator";
					message?: string;
					summary?: string;
					notes?: { inShort: string };
				};
				return {
					title: output.audience
						? t("admin.checkpoints.journal.brief", "Brief before call {call}", {
								call: (entry.sprint ?? 0) + 1,
							})
						: output.summary
							? t("admin.checkpoints.journal.report", "Final report written")
							: t(
									"admin.checkpoints.journal.review",
									"Sprint {sprint} review written",
									{ sprint: entry.sprint },
								),
					body: output.summary ?? output.message ?? output.notes?.inShort,
					more: {
						label: t(
							"admin.checkpoints.journal.inputAndAnswer",
							"Input and full answer",
						),
						content: raw,
					},
				};
			}
			case CheckpointJournalKind.Verdict: {
				const verdict = entry.output as Verdict;
				return {
					title: !verdict.settled
						? t(
								"admin.checkpoints.journal.aiRead",
								"The AI's read of the verdict",
							)
						: verdict.by === "curator"
							? t(
									"admin.checkpoints.journal.curatorSent",
									"Verdict sent by the curator",
								)
							: t("admin.checkpoints.journal.settled", "Verdict settled"),
					body: (
						<Flex vertical gap={4}>
							<Flex gap={8} align="center" wrap>
								{verdict.proposed && (
									<>
										{t("admin.checkpoints.journal.proposed", "Proposed")}
										<VerdictChip verdict={verdict.proposed} />
									</>
								)}
								{verdict.proposed && verdict.settled && "→"}
								{verdict.settled && (
									<>
										{t("admin.checkpoints.journal.settledAs", "Settled")}
										<VerdictChip verdict={verdict.settled} />
									</>
								)}
							</Flex>
							{verdict.overrode &&
								t(
									"admin.checkpoints.journal.overrode",
									"The rule overrode the model: {count} outcomes have no artifact that opens.",
									{ count: verdict.unproven?.length ?? 0 },
								)}
							{verdict.note}
						</Flex>
					),
					more: {
						label: t(
							"admin.checkpoints.journal.basedOn",
							"What it was based on",
						),
						content: raw,
					},
				};
			}
		}
	};
	const {
		title,
		tag,
		body,
		more = {
			label: t("admin.checkpoints.journal.whatWasRead", "What was read"),
			content: whatWasRead(),
		},
	} = view();

	return (
		<Flex gap={12} className={styles.entry}>
			<IconTile icon={ICON[entry.kind]} size="xs" />
			<Flex vertical gap={6} flex={1} className={styles.content}>
				<Flex justify="space-between" gap={8} align="center">
					<Flex gap={8} align="center">
						<Typography.Text strong>{title}</Typography.Text>
						{tag}
					</Flex>
					<Typography.Text type="secondary" className={styles.when}>
						{dayjs(entry.createdAt).format("D MMM, HH:mm")}
					</Typography.Text>
				</Flex>
				{entry.link && (
					<Typography.Link href={entry.link} target="_blank" ellipsis>
						{entry.link}
					</Typography.Link>
				)}
				<Typography.Text type="secondary">{body}</Typography.Text>
				<Collapse
					ghost
					size="small"
					items={[{ key: "more", label: more.label, children: more.content }]}
				/>
			</Flex>
		</Flex>
	);
}
