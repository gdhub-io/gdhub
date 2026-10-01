"use client";

import {
	type Icon,
	IconAlertTriangle,
	IconBlocks,
	IconSearch,
	IconTrash,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Flex,
	Input,
	Pagination,
	Popconfirm,
	Segmented,
	Skeleton,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";
import ModernTable from "@/components/ModernTable";
import {
	EmptyState,
	IconTile,
	StatusDot,
	type StatusTone,
} from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { ArtifactCheckStatus } from "@/config/prisma-enums";
import {
	ARTIFACT_KINDS,
	type ArtifactKind,
	type ArtifactListItem,
	type ArtifactRow,
	kindOfType,
	sortArtifacts,
	toRows,
} from "./artifacts";
import {
	KIND_ICON,
	useArtifactKindLabel,
	useArtifactTypeLabel,
} from "./labels";
import styles from "./style.module.scss";

const { Text } = Typography;

const PAGE_SIZE = 25;

const CHECK_TONE: Record<ArtifactCheckStatus, StatusTone> = {
	[ArtifactCheckStatus.Readable]: "success",
	[ArtifactCheckStatus.Pending]: "neutral",
	[ArtifactCheckStatus.Unreachable]: "danger",
	[ArtifactCheckStatus.Unsupported]: "warning",
};

/** Frame `eEvzk`: a tile and one plain line. `EmptyState` sets its title in 16/600. */
const Blank = ({ icon, text }: { icon: Icon; text: string }) => (
	<Flex vertical align="center" gap={16} className={styles.blank}>
		<IconTile icon={icon} size="lg" tint="var(--gd-neutral-100)" />
		<Text type="secondary">{text}</Text>
	</Flex>
);

export type ArtifactsViewProps = {
	artifacts: ArtifactListItem[];
	status: "loading" | "error" | "ready";
	/** Adding and deleting belong to whoever manages the project's artifacts. */
	canManage: boolean;
	onRetry: () => void;
	onDelete: (id: string) => void;
};

/** The project's artifact store — frames `R7JKH` (list) and `V3HRXh` (states). */
export function ArtifactsView({
	artifacts,
	status,
	canManage,
	onRetry,
	onDelete,
}: ArtifactsViewProps) {
	const { t } = useTranslate();
	const kindLabel = useArtifactKindLabel();
	const typeLabel = useArtifactTypeLabel();
	const [kind, setKind] = useState<ArtifactKind | "all">("all");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);

	if (status === "error") {
		return (
			<div className={styles.panel}>
				<EmptyState
					icon={IconAlertTriangle}
					tint="var(--gd-danger-tint)"
					ink="var(--gd-danger-solid)"
					title={t("artifacts.error.title", "Artifacts could not be loaded")}
					action={
						<Button type="primary" onClick={onRetry}>
							{t("artifacts.error.retry", "Try again")}
						</Button>
					}
				/>
			</div>
		);
	}

	if (status === "loading") {
		return (
			<div className={styles.card}>
				{Array.from({ length: 4 }, (_, index) => (
					<Skeleton
						// biome-ignore lint/suspicious/noArrayIndexKey: placeholders carry no identity
						key={index}
						active
						avatar={{ shape: "square", size: 24 }}
						title={{ width: "40%" }}
						paragraph={false}
						className={styles.skeletonRow}
					/>
				))}
			</div>
		);
	}

	if (artifacts.length === 0) {
		return (
			<div className={styles.panel}>
				<Blank
					icon={IconBlocks}
					text={t("artifacts.empty", "Your first artifact will appear here.")}
				/>
			</div>
		);
	}

	const query = search.trim().toLowerCase();
	const found = sortArtifacts(
		query
			? artifacts.filter((artifact) =>
					`${artifact.name ?? ""} ${artifact.link}`
						.toLowerCase()
						.includes(query),
				)
			: artifacts,
	);
	const shown =
		kind === "all"
			? found
			: found.filter((artifact) => kindOfType(artifact.type) === kind);

	// A filter can leave fewer pages than the one being looked at.
	const current = Math.min(
		page,
		Math.max(1, Math.ceil(shown.length / PAGE_SIZE)),
	);
	const rows = toRows(
		shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
		shown,
	);

	const columnCount = canManage ? 6 : 5;
	const onlyOnArtifact = (row: ArtifactRow) =>
		row.row === "artifact" ? {} : { colSpan: 0 };

	const columns: ColumnsType<ArtifactRow> = [
		{
			key: "artifact",
			title: t("artifacts.column.artifact", "Artifact"),
			onCell: (row) => (row.row === "artifact" ? {} : { colSpan: columnCount }),
			render: (_, row) => {
				if (row.row === "stage") {
					return (
						<Flex align="center" gap={10}>
							<Text strong className={styles.stage}>
								{row.name ?? t("artifacts.unsorted", "Unsorted")}
							</Text>
							<Text className={styles.count}>
								{row.name
									? t(
											"artifacts.stage.count",
											"{count, plural, one {# artifact} other {# artifacts}}",
											{ count: row.count },
										)
									: t("artifacts.unsortedHint", "No stage")}
							</Text>
						</Flex>
					);
				}

				const { artifact } = row;
				const KindIcon = KIND_ICON[kindOfType(artifact.type)];
				const name = artifact.name || artifact.link;

				return (
					<Flex align="center" gap={10} className={styles.shrink}>
						<KindIcon size={18} stroke={2} className={styles.kindIcon} />
						<Link href={artifact.link} target="_blank" className={styles.name}>
							<Text ellipsis={{ tooltip: name }}>{name}</Text>
						</Link>
						<Tooltip title={typeLabel(artifact.type)}>
							<Tag className={styles.kind}>
								{kindLabel(kindOfType(artifact.type))}
							</Tag>
						</Tooltip>
					</Flex>
				);
			},
		},
		{
			key: "check",
			title: t("artifacts.column.check", "Check"),
			width: 160,
			onCell: onlyOnArtifact,
			render: (_, row) => {
				if (row.row !== "artifact") return null;
				const check = row.artifact.checkStatus;
				if (!check) return <Text type="secondary">—</Text>;

				const label = {
					[ArtifactCheckStatus.Readable]: t("artifacts.check.ready", "Ready"),
					[ArtifactCheckStatus.Pending]: t(
						"artifacts.check.pending",
						"Checking…",
					),
					[ArtifactCheckStatus.Unreachable]: t(
						"artifacts.check.unreachable",
						"Cannot be opened",
					),
					[ArtifactCheckStatus.Unsupported]: t(
						"artifacts.check.unsupported",
						"Saved, not readable",
					),
				}[check];

				return <StatusDot tone={CHECK_TONE[check]} label={label} />;
			},
		},
		{
			key: "stage",
			title: t("artifacts.column.workflow", "Workflow"),
			width: 192,
			onCell: onlyOnArtifact,
			render: (_, row) =>
				row.row === "artifact" && (
					<Text type="secondary" ellipsis>
						{row.artifact.step?.name ?? "—"}
					</Text>
				),
		},
		{
			key: "addedBy",
			title: t("artifacts.column.addedBy", "Added by"),
			width: 160,
			responsive: ["lg"],
			onCell: onlyOnArtifact,
			render: (_, row) =>
				row.row === "artifact" && (
					<Flex align="center" gap={8} className={styles.shrink}>
						<AppAvatar src={row.artifact.createdByUser.image} size={24} />
						<Text type="secondary" ellipsis>
							{row.artifact.createdByUser.name}
						</Text>
					</Flex>
				),
		},
		{
			key: "when",
			title: t("artifacts.column.when", "When"),
			width: 112,
			responsive: ["lg"],
			onCell: onlyOnArtifact,
			render: (_, row) =>
				row.row === "artifact" && (
					<Text type="secondary">
						{dayjs(row.artifact.createdAt).format("D MMM YYYY")}
					</Text>
				),
		},
		{
			key: "actions",
			width: 64,
			hidden: !canManage,
			onCell: onlyOnArtifact,
			render: (_, row) =>
				row.row === "artifact" && (
					<Popconfirm
						title={t("artifacts.deleteConfirm", "Delete this artifact?")}
						okText={t("Yes", "Yes")}
						cancelText={t("No", "No")}
						onConfirm={() => onDelete(row.artifact.id)}
					>
						<Button
							type="text"
							danger
							icon={<IconTrash size={16} stroke={2} />}
							aria-label={t("artifacts.delete", "Delete artifact")}
						/>
					</Popconfirm>
				),
		},
	];

	const kindOptions = [
		{
			value: "all" as const,
			label: `${t("artifacts.filter.all", "All")} ${found.length}`,
		},
		...ARTIFACT_KINDS.map((value) => {
			const KindIcon = KIND_ICON[value];
			const count = found.filter(
				(artifact) => kindOfType(artifact.type) === value,
			).length;

			return {
				value,
				icon: <KindIcon size={14} stroke={2} />,
				label: `${kindLabel(value)} ${count}`,
			};
		}),
	];

	return (
		<>
			<Flex
				align="center"
				justify="space-between"
				gap={12}
				wrap
				className={styles.toolbar}
			>
				<Segmented<ArtifactKind | "all">
					value={kind}
					options={kindOptions}
					onChange={(value) => {
						setKind(value);
						setPage(1);
					}}
				/>
				<Input
					allowClear
					className={styles.search}
					prefix={<IconSearch size={16} stroke={2} />}
					placeholder={t("artifacts.search", "Search artifacts")}
					value={search}
					onChange={(event) => {
						setSearch(event.target.value);
						setPage(1);
					}}
				/>
			</Flex>

			<ModernTable<ArtifactRow>
				className={styles.table}
				columns={columns}
				dataSource={rows}
				rowKey="key"
				rowClassName={(row) => (row.row === "stage" ? styles.stageRow : "")}
				pagination={false}
				tableLayout="fixed"
				scroll={{ x: 720 }}
				locale={{
					emptyText: (
						<Blank
							icon={IconSearch}
							text={t("artifacts.noMatch", "No artifacts match")}
						/>
					),
				}}
			/>

			<Flex align="center" justify="space-between" className={styles.footer}>
				<Text type="secondary">
					{t(
						"artifacts.total",
						"{count, plural, one {# artifact} other {# artifacts}}",
						{ count: shown.length },
					)}
				</Text>
				<Pagination
					current={current}
					pageSize={PAGE_SIZE}
					total={shown.length}
					showSizeChanger={false}
					hideOnSinglePage
					onChange={setPage}
				/>
			</Flex>
		</>
	);
}
