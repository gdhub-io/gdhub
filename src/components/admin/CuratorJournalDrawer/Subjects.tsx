"use client";

import { IconFileText, IconNotebook, IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Table, Typography } from "antd";
import type { ReactNode } from "react";
import { EvidenceMatchDot } from "@/components/checkpoints/EvidenceMatchTag";
import { useArtifactTypeLabel } from "@/components/MyProjectArtifacts/labels";
import { IconTile, StatusDot } from "@/components/ui";
import { formatShort as day } from "@/components/WorkflowPath/dates";
import type { ProjectArtifactType } from "@/config/prisma-enums";
import type {
	CuratorJournalViewDto,
	JournalTaskDto,
} from "@/types/checkpoint-journal";
import { Boundary, FoldOuts, when } from "./parts";
import styles from "./style.module.scss";

/** Frame 12.11.10f: the plan, its dates and where each task stands. */
export function PlanTab({ plan }: { plan: CuratorJournalViewDto["plan"] }) {
	const { t } = useTranslate();
	const typeLabel = useArtifactTypeLabel();
	const dates = [
		plan.sentAt &&
			t("admin.checkpoints.journal.plan.sent", "Sent for the check {date}", {
				date: when(plan.sentAt),
			}),
		plan.approvedAt &&
			t("admin.checkpoints.journal.plan.approved", "Approved {date}", {
				date: when(plan.approvedAt),
			}) + (plan.approvedBy ? ` · ${plan.approvedBy}` : ""),
		plan.confirmedAt &&
			t(
				"admin.checkpoints.journal.plan.confirmed",
				"Changed on day 15 · confirmed {date}",
				{
					date: when(plan.confirmedAt),
				},
			),
	].filter(Boolean);
	const status = (task: JournalTaskDto) =>
		task.cut ? (
			<StatusDot
				tone="neutral"
				label={t("admin.checkpoints.journal.plan.cut", "Cut")}
			/>
		) : task.evidence.length ? (
			<StatusDot
				tone="success"
				label={
					task.doneIn
						? t(
								"admin.checkpoints.journal.plan.doneIn",
								"Done · sprint {sprint}",
								{
									sprint: task.doneIn,
								},
							)
						: t("admin.checkpoints.journal.plan.done", "Done")
				}
			/>
		) : (
			<StatusDot
				tone="neutral"
				label={t("admin.checkpoints.journal.plan.open", "Open")}
			/>
		);

	return (
		<Flex vertical gap={16}>
			{dates.length > 0 && (
				<Typography.Text type="secondary" className={styles.meta}>
					{dates.join(" · ")}
				</Typography.Text>
			)}
			<Table
				rowKey="id"
				size="small"
				pagination={false}
				dataSource={plan.tasks}
				columns={[
					{
						key: "task",
						title: t("admin.checkpoints.journal.plan.task", "Task"),
						render: (_, task) => (
							<Flex vertical gap={2}>
								<Typography.Text>{task.text}</Typography.Text>
								{task.firstWording && (
									<Typography.Text type="secondary" className={styles.meta}>
										{t(
											"admin.checkpoints.journal.plan.firstWording",
											"First worded: {text}",
											{
												text: task.firstWording,
											},
										)}
									</Typography.Text>
								)}
								{task.addedAt && (
									<Typography.Text type="secondary" className={styles.meta}>
										{t("admin.checkpoints.journal.plan.added", "Added {date}", {
											date: day(task.addedAt),
										})}
									</Typography.Text>
								)}
							</Flex>
						),
					},
					{
						key: "status",
						width: 160,
						title: t("admin.checkpoints.journal.plan.status", "Status"),
						render: (_, task) => status(task),
					},
					{
						key: "evidence",
						width: 220,
						title: t("admin.checkpoints.journal.plan.evidence", "Evidence"),
						render: (_, task) =>
							task.evidence.length ? (
								<Flex vertical gap={4}>
									{task.evidence.map((piece) => (
										<Typography.Link
											key={piece.link}
											href={piece.link}
											target="_blank"
											ellipsis
										>
											{piece.name ??
												typeLabel(piece.type as ProjectArtifactType)}
										</Typography.Link>
									))}
								</Flex>
							) : (
								<Typography.Text type="secondary">—</Typography.Text>
							),
					},
					{
						key: "read",
						width: 160,
						title: t("admin.checkpoints.journal.plan.read", "AI read"),
						// One line per artifact, beside the evidence column's own.
						render: (_, task) =>
							task.evidence.length ? (
								<Flex vertical gap={4}>
									{task.evidence.map((piece) =>
										piece.match ? (
											<Typography.Text
												key={piece.link}
												title={piece.note ?? undefined}
											>
												<EvidenceMatchDot match={piece.match} />
											</Typography.Text>
										) : (
											<Typography.Text key={piece.link} type="secondary">
												—
											</Typography.Text>
										),
									)}
								</Flex>
							) : (
								<Typography.Text type="secondary">—</Typography.Text>
							),
					},
				]}
			/>
		</Flex>
	);
}

/** Cards under a line per sprint, the way the conversation divides them. */
function BySprint<T extends { id: string; sprint: number | null }>({
	rows,
	empty,
	children,
}: {
	rows: T[];
	empty: string;
	children: (row: T) => ReactNode;
}) {
	const { t } = useTranslate();
	if (!rows.length)
		return <Typography.Text type="secondary">{empty}</Typography.Text>;
	const sprints = [...new Set(rows.map((row) => row.sprint))];
	return (
		<Flex vertical gap={16}>
			{sprints.map((sprint) => (
				<Flex key={sprint ?? "none"} vertical gap={12}>
					<Boundary
						label={
							sprint
								? t("admin.checkpoints.journal.sprint", "Sprint {sprint}", {
										sprint,
									})
								: t(
										"admin.checkpoints.journal.outsideSprints",
										"Outside the sprints",
									)
						}
					/>
					{rows.filter((row) => row.sprint === sprint).map(children)}
				</Flex>
			))}
		</Flex>
	);
}

/** What the AI found in one thing it looked at, or that it never did. */
function AiRead({
	match,
	text,
	unread,
}: {
	match?: Parameters<typeof EvidenceMatchDot>[0]["match"] | null;
	text: string | null;
	unread?: string | null;
}) {
	const { t } = useTranslate();
	return (
		<Flex vertical gap={4} className={styles.aiRead}>
			<Flex gap={8} align="center">
				<IconSparkles size={14} />
				<Typography.Text type="secondary" className={styles.meta}>
					{t("admin.checkpoints.journal.aiFound", "What the AI found")}
				</Typography.Text>
				{match && <EvidenceMatchDot match={match} />}
			</Flex>
			{text && <Typography.Text>{text}</Typography.Text>}
			{unread && (
				<Typography.Text type="secondary">
					{t("admin.checkpoints.journal.unread", "Not read — {why}", {
						why: unread,
					})}
				</Typography.Text>
			)}
		</Flex>
	);
}

/** Frame 12.11.10g: what each sprint added, and what the AI found in it. */
export function ArtifactsTab({
	artifacts,
}: {
	artifacts: CuratorJournalViewDto["artifacts"];
}) {
	const { t } = useTranslate();
	const typeLabel = useArtifactTypeLabel();
	return (
		<BySprint
			rows={artifacts}
			empty={t(
				"admin.checkpoints.journal.noArtifacts",
				"No artifacts were added during the checkpoint.",
			)}
		>
			{(row) => (
				<Flex key={row.id} vertical gap={10} className={styles.card}>
					<Flex gap={12} align="center">
						<IconTile icon={IconFileText} size="xs" />
						<Flex vertical>
							<Typography.Text strong>
								{row.name ?? typeLabel(row.type as ProjectArtifactType)}
							</Typography.Text>
							<Typography.Text type="secondary" className={styles.meta}>
								{[
									typeLabel(row.type as ProjectArtifactType),
									row.addedBy &&
										t("admin.checkpoints.journal.addedBy", "added by {who}", {
											who: row.addedBy,
										}),
									day(row.addedAt),
									row.tasks.length
										? t("admin.checkpoints.journal.proves", "proves “{task}”", {
												task: row.tasks.join("”, “"),
											})
										: t("admin.checkpoints.journal.beside", "beside the tasks"),
								]
									.filter(Boolean)
									.join(" · ")}
							</Typography.Text>
						</Flex>
					</Flex>
					<Typography.Link href={row.link} target="_blank" ellipsis>
						{row.link}
					</Typography.Link>
					{row.read ? (
						<AiRead match={row.read.match} text={row.read.text} />
					) : (
						<Typography.Text type="secondary" className={styles.meta}>
							{t(
								"admin.checkpoints.journal.notLooked",
								"Not looked at by the AI",
							)}
						</Typography.Text>
					)}
					{row.read && <FoldOuts source={row.read.source} />}
				</Flex>
			)}
		</BySprint>
	);
}

/** Frame 12.11.10h: what was posted, and what the AI read in its media. */
export function DevlogsTab({
	devlogs,
}: {
	devlogs: CuratorJournalViewDto["devlogs"];
}) {
	const { t } = useTranslate();
	return (
		<BySprint
			rows={devlogs}
			empty={t(
				"admin.checkpoints.journal.noDevlogs",
				"No devlogs were posted during the checkpoint.",
			)}
		>
			{(row) => (
				<Flex key={row.id} vertical gap={10} className={styles.card}>
					<Flex gap={12} align="center">
						<IconTile icon={IconNotebook} size="xs" />
						<Flex vertical>
							<Typography.Text strong>
								{row.number
									? t(
											"admin.checkpoints.journal.devlogNumber",
											"Devlog #{number}",
											{
												number: row.number,
											},
										)
									: t("admin.checkpoints.journal.devlogPlain", "Devlog")}
							</Typography.Text>
							<Typography.Text type="secondary" className={styles.meta}>
								{[row.author, when(row.publishedAt)]
									.filter(Boolean)
									.join(" · ")}
							</Typography.Text>
						</Flex>
					</Flex>
					<Typography.Paragraph
						ellipsis={{ rows: 4, expandable: true }}
						className={`${styles.flush} ${styles.lines}`}
					>
						{row.text}
					</Typography.Paragraph>
					{row.media.length ? (
						row.media.map((media, index) => (
							<Flex key={media.link ?? index} vertical gap={4}>
								<AiRead text={media.text} unread={media.unread} />
								<FoldOuts
									details={
										media.link ? [{ label: "link", value: media.link }] : []
									}
									source={media.source}
								/>
							</Flex>
						))
					) : (
						<Typography.Text type="secondary" className={styles.meta}>
							{t(
								"admin.checkpoints.journal.noMedia",
								"No images or videos read",
							)}
						</Typography.Text>
					)}
				</Flex>
			)}
		</BySprint>
	);
}

/** What the team came with: the inputs it named at purchase, and what the project had made before. */
export function InputsTab({
	inputs,
}: {
	inputs: CuratorJournalViewDto["inputs"];
}) {
	const { t } = useTranslate();
	const typeLabel = useArtifactTypeLabel();
	return (
		<Flex vertical gap={24}>
			<Flex vertical gap={12}>
				<Typography.Text strong>
					{t(
						"admin.checkpoints.journal.inputs.named",
						"What the team named at the start",
					)}
				</Typography.Text>
				{inputs.items.length ? (
					inputs.items.map((item) => (
						<Flex key={item.id} vertical gap={8} className={styles.card}>
							<Typography.Text>{item.text}</Typography.Text>
							{item.evidence.map((piece) => (
								<Flex key={piece.link} vertical gap={4}>
									<Typography.Link href={piece.link} target="_blank" ellipsis>
										{piece.name ?? typeLabel(piece.type as ProjectArtifactType)}
									</Typography.Link>
									{piece.match && (
										<AiRead match={piece.match} text={piece.note} />
									)}
								</Flex>
							))}
						</Flex>
					))
				) : (
					<Typography.Text type="secondary">
						{t(
							"admin.checkpoints.journal.inputs.none",
							"No inputs were named.",
						)}
					</Typography.Text>
				)}
			</Flex>
			<Flex vertical gap={12}>
				<Typography.Text strong>
					{t(
						"admin.checkpoints.journal.inputs.before",
						"Made before the checkpoint",
					)}
				</Typography.Text>
				{inputs.before.length ? (
					<Table
						rowKey="id"
						size="small"
						pagination={false}
						dataSource={inputs.before}
						columns={[
							{
								key: "name",
								title: t(
									"admin.checkpoints.journal.inputs.artifact",
									"Artifact",
								),
								render: (_, row) => (
									<Typography.Link href={row.link} target="_blank" ellipsis>
										{row.name ?? typeLabel(row.type as ProjectArtifactType)}
									</Typography.Link>
								),
							},
							{
								key: "type",
								width: 160,
								title: t("admin.checkpoints.journal.inputs.type", "Type"),
								render: (_, row) => typeLabel(row.type as ProjectArtifactType),
							},
							{
								key: "added",
								width: 140,
								title: t("admin.checkpoints.journal.inputs.added", "Added"),
								render: (_, row) => day(row.addedAt),
							},
						]}
					/>
				) : (
					<Typography.Text type="secondary">
						{t(
							"admin.checkpoints.journal.inputs.nothingBefore",
							"The project had no artifacts before the checkpoint.",
						)}
					</Typography.Text>
				)}
			</Flex>
		</Flex>
	);
}
