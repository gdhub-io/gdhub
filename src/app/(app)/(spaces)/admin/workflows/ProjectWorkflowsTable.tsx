"use client";

import type { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import {
	IconAlertTriangle,
	IconArrowsShuffle,
	IconDots,
	IconExternalLink,
	IconFolder,
	IconGitBranch,
	IconGitCompare,
	IconRefresh,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	App,
	Button,
	Dropdown,
	Flex,
	Input,
	Progress,
	Select,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
	type ResetTarget,
	ResetWorkflowModal,
} from "@/components/admin/workflow/ResetWorkflowModal";
import {
	type DifferencesTarget,
	WorkflowDifferencesModal,
} from "@/components/admin/workflow/WorkflowDifferencesModal";
import ModernTable from "@/components/ModernTable";
import styles from "./style.module.scss";

const { Text } = Typography;

/**
 * A workflow on an archived project is not a live plan, and the list is scanned
 * for the live ones. Only states that mean "not running" are labelled — a tag on
 * every row would say nothing.
 */
const STATUS_TAG: Partial<
	Record<ProjectStatus, { label: string; color: string }>
> = {
	Registered: { label: "Not approved", color: "default" },
	Rejected: { label: "Rejected", color: "red" },
	Dormant: { label: "Dormant", color: "default" },
	Archived: { label: "Archived", color: "default" },
	Released: { label: "Released", color: "green" },
	KilledWithDignity: { label: "Killed with dignity", color: "red" },
};

const LIVE_STATUSES: ProjectStatus[] = ["Approved", "Registered", "Released"];

const toResetTarget = (row: ProjectWorkflowRow): ResetTarget => ({
	id: row.id,
	projectName: row.project.name,
	templateId: row.template?.id ?? null,
});

/** Falls back to the raw value, so a status added to the enum still shows. */
const statusTag = (status: ProjectStatus) =>
	STATUS_TAG[status] ?? { label: status, color: "default" };

export type ProjectWorkflowRow = {
	id: string;
	project: {
		id: string;
		name: string;
		slug: string;
		status: ProjectStatus;
		authorName: string | null;
	};
	template: { id: string; name: string; title: string | null } | null;
	isModified: boolean;
	stage: { name: string | null; index: number; total: number };
	progress: { done: number; total: number; percent: number };
	startedAt: string;
	lastActivityAt: string;
};

export function ProjectWorkflowsTable({
	workflows,
	loading,
}: {
	workflows: ProjectWorkflowRow[];
	loading: boolean;
}) {
	const { message, modal } = App.useApp();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [template, setTemplate] = useState<string>("any");
	const [stage, setStage] = useState<string>("any");
	const [drift, setDrift] = useState<"any" | "modified" | "untouched">("any");
	const [life, setLife] = useState<"any" | "live" | "closed">("live");
	const [selected, setSelected] = useState<string[]>([]);
	const [resetTargets, setResetTargets] = useState<ResetTarget[]>([]);
	const [diffTarget, setDiffTarget] = useState<DifferencesTarget | null>(null);

	const { mutateAsync: deleteWorkflow } = useMutation({
		mutationFn: (id: string) =>
			axios.delete(`/api/admin/project-workflow/${id}`),
		onSuccess: () => {
			message.success("Workflow deleted");
			queryClient.invalidateQueries({
				queryKey: ["admin", "project-workflows"],
			});
		},
	});

	const confirmDelete = (record: ProjectWorkflowRow) => {
		modal.confirm({
			title: `Delete the workflow of “${record.project.name}”?`,
			content:
				"The project loses its steps, its stage and the progress recorded against them. This cannot be undone.",
			okText: "Delete",
			okButtonProps: { danger: true },
			onOk: () => deleteWorkflow(record.id),
		});
	};

	const templateOptions = useMemo(() => {
		const seen = new Map<string, string>();
		for (const row of workflows) {
			if (row.template) {
				seen.set(row.template.id, row.template.title ?? row.template.name);
			}
		}
		return [
			{ value: "any", label: "Any template" },
			...[...seen].map(([value, label]) => ({ value, label })),
		];
	}, [workflows]);

	const stageOptions = useMemo(() => {
		const seen = new Set<string>();
		for (const row of workflows) {
			if (row.stage.name) seen.add(row.stage.name);
		}
		return [
			{ value: "any", label: "Any stage" },
			...[...seen].map((value) => ({ value, label: value })),
		];
	}, [workflows]);

	const rows = useMemo(() => {
		const query = search.trim().toLowerCase();

		return workflows.filter((row) => {
			if (template !== "any" && row.template?.id !== template) return false;
			if (stage !== "any" && row.stage.name !== stage) return false;
			if (drift === "modified" && !row.isModified) return false;
			if (drift === "untouched" && row.isModified) return false;
			const isLive = LIVE_STATUSES.includes(row.project.status);
			if (life === "live" && !isLive) return false;
			if (life === "closed" && isLive) return false;
			if (!query) return true;
			return (
				row.project.name.toLowerCase().includes(query) ||
				(row.project.authorName ?? "").toLowerCase().includes(query)
			);
		});
	}, [workflows, search, template, stage, drift, life]);

	const columns: ColumnsType<ProjectWorkflowRow> = [
		{
			title: "Project",
			dataIndex: ["project", "name"],
			render: (_value, record) => (
				<Flex vertical gap={2}>
					<Flex align="center" gap={8} wrap>
						<Link
							href={`/admin/project-workflow/${record.id}`}
							className={styles.rowTitleText}
						>
							{record.project.name}
						</Link>
						{STATUS_TAG[record.project.status] && (
							<Tag
								color={STATUS_TAG[record.project.status]?.color}
								variant="outlined"
								className={styles.driftTag}
							>
								{STATUS_TAG[record.project.status]?.label}
							</Tag>
						)}
					</Flex>
					{record.project.authorName && (
						<Text type="secondary" className={styles.rowSlug}>
							by {record.project.authorName}
						</Text>
					)}
				</Flex>
			),
		},
		{
			title: "Template",
			width: 220,
			render: (_value, record) => (
				<Flex vertical gap={4} align="flex-start">
					<Text>{record.template?.title ?? record.template?.name ?? "—"}</Text>
					{/* The one thing to know before resetting: is there work here that
					    a reset would discard? */}
					{record.isModified && (
						<Tag
							color="warning"
							variant="outlined"
							icon={<IconGitBranch size={11} />}
							className={styles.driftTag}
						>
							Modified
						</Tag>
					)}
				</Flex>
			),
		},
		{
			title: "Stage",
			width: 180,
			render: (_value, record) => (
				<Flex vertical gap={2}>
					<Text strong>{record.stage.name ?? "Not started"}</Text>
					<Text type="secondary" className={styles.rowSlug}>
						{record.stage.index
							? `Step ${record.stage.index} of ${record.stage.total}`
							: `${record.stage.total} steps`}
					</Text>
				</Flex>
			),
		},
		{
			title: "Progress",
			width: 240,
			render: (_value, record) => (
				<Flex vertical gap={2}>
					<Progress
						percent={record.progress.percent}
						showInfo={false}
						size="small"
					/>
					<Text type="secondary" className={styles.rowSlug}>
						{record.progress.done} / {record.progress.total} tasks ·{" "}
						{record.progress.percent}%
					</Text>
				</Flex>
			),
		},
		{
			title: "Last activity",
			width: 160,
			render: (_value, record) => (
				<Flex vertical gap={2}>
					<Text>{dayjs(record.lastActivityAt).fromNow()}</Text>
					<Text type="secondary" className={styles.rowMuted}>
						started {dayjs(record.startedAt).fromNow()}
					</Text>
				</Flex>
			),
		},
		{
			key: "actions",
			width: 64,
			align: "right",
			render: (_value, record) => (
				<Dropdown
					trigger={["click"]}
					menu={{
						items: [
							{
								key: "workflow",
								icon: <IconExternalLink size={16} />,
								label: (
									<Link href={`/admin/project-workflow/${record.id}`}>
										Open workflow
									</Link>
								),
							},
							{
								key: "project",
								icon: <IconFolder size={16} />,
								label: (
									<Link
										href={`/project/${record.project.slug}`}
										target="_blank"
									>
										Open project
									</Link>
								),
							},
							{
								key: "differences",
								icon: <IconGitCompare size={16} />,
								label: "View differences",
								disabled: !record.isModified,
								onClick: () =>
									setDiffTarget({
										id: record.id,
										projectName: record.project.name,
									}),
							},
							{ type: "divider" },
							{
								key: "reset",
								icon: <IconRefresh size={16} />,
								label: "Reset to template…",
								onClick: () => setResetTargets([toResetTarget(record)]),
							},
							{
								// The reset modal already chooses the template, so moving a
								// project is that flow entered with the choice in mind rather
								// than a second path to the same writes.
								key: "move",
								icon: <IconArrowsShuffle size={16} />,
								label: "Move to another template…",
								onClick: () => setResetTargets([toResetTarget(record)]),
							},
							{ type: "divider" },
							{
								key: "delete",
								icon: <IconTrash size={16} />,
								label: "Delete workflow",
								danger: true,
								onClick: () => confirmDelete(record),
							},
						],
					}}
				>
					<Button type="text" icon={<IconDots size={18} />} />
				</Dropdown>
			),
		},
	];

	return (
		<>
			<Flex gap={12} wrap className={styles.toolbar}>
				<Input.Search
					allowClear
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search by project or author"
					className={styles.search}
				/>
				<Select
					value={template}
					onChange={setTemplate}
					options={templateOptions}
					className={styles.sort}
				/>
				<Select
					value={stage}
					onChange={setStage}
					options={stageOptions}
					className={styles.filter}
				/>
				<Select
					value={life}
					onChange={setLife}
					className={styles.filter}
					options={[
						{ value: "live", label: "Live projects" },
						{ value: "closed", label: "Archived & closed" },
						{ value: "any", label: "Any project" },
					]}
				/>
				<Select
					value={drift}
					onChange={setDrift}
					className={styles.filter}
					options={[
						{ value: "any", label: "Any status" },
						{ value: "modified", label: "Modified" },
						{ value: "untouched", label: "Matches template" },
					]}
				/>
			</Flex>

			{selected.length > 0 && (
				<Flex
					align="center"
					justify="space-between"
					gap={16}
					className={styles.bulkBar}
				>
					<Flex align="center" gap={8}>
						<IconAlertTriangle size={16} />
						{selected.length} project workflow
						{selected.length === 1 ? "" : "s"} selected
					</Flex>
					<Flex align="center" gap={8}>
						<Button
							size="small"
							icon={<IconRefresh size={14} />}
							onClick={() =>
								setResetTargets(
									workflows
										.filter((row) => selected.includes(row.id))
										.map(toResetTarget),
								)
							}
						>
							Reset to template…
						</Button>
						<Button size="small" onClick={() => setSelected([])}>
							Clear
						</Button>
					</Flex>
				</Flex>
			)}

			<ModernTable<ProjectWorkflowRow>
				rowKey="id"
				columns={columns}
				dataSource={rows}
				loading={loading}
				rowSelection={{
					selectedRowKeys: selected,
					onChange: (keys) => setSelected(keys as string[]),
				}}
				pagination={{ pageSize: 10, hideOnSinglePage: true }}
				emptyState={{
					title: "No project workflows found",
					description: "Workflows matching your filters will appear here.",
				}}
			/>

			<ResetWorkflowModal
				targets={resetTargets}
				onClose={() => setResetTargets([])}
			/>

			<WorkflowDifferencesModal
				target={diffTarget}
				onClose={() => setDiffTarget(null)}
			/>
		</>
	);
}

export default ProjectWorkflowsTable;
