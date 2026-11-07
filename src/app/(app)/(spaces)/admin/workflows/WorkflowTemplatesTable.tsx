"use client";

import {
	IconCopy,
	IconDots,
	IconDownload,
	IconExternalLink,
	IconRefresh,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Dropdown, Input, Select, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useProjectWorkflows } from "@/components/admin/workflow/queries";
import {
	type ResetTarget,
	ResetWorkflowModal,
} from "@/components/admin/workflow/ResetWorkflowModal";
import ModernTable from "@/components/ModernTable";
import styles from "./style.module.scss";

export type WorkflowTemplateRow = {
	id: string;
	name: string;
	title: string | null;
	description: string | null;
	updatedAt: string;
	stepCount: number;
	taskCount: number;
	usedBy: number;
	status: "draft" | "active" | "unused";
};

const STATUS_META: Record<
	WorkflowTemplateRow["status"],
	{ label: string; color: string }
> = {
	active: { label: "Active", color: "green" },
	unused: { label: "Not in use", color: "blue" },
	draft: { label: "Draft", color: "default" },
};

type SortKey = "updated" | "title" | "used";

export function WorkflowTemplatesTable({
	templates,
	loading,
	error,
	onRetry,
}: {
	templates: WorkflowTemplateRow[];
	loading: boolean;
	error?: boolean;
	onRetry?: () => void;
}) {
	const { message, modal } = App.useApp();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<WorkflowTemplateRow["status"] | "any">(
		"any",
	);
	const [sort, setSort] = useState<SortKey>("updated");

	const [resetTargets, setResetTargets] = useState<ResetTarget[]>([]);

	const { mutateAsync: deleteTemplate } = useMutation({
		mutationFn: (id: string) => axios.delete(`/api/admin/workflow/${id}`),
		onSuccess: () => {
			message.success("Template deleted");
			queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
		},
	});

	// The projects on a template, for the reset entry in the row menu.
	const { data: projectWorkflows } = useProjectWorkflows();

	const { mutateAsync: duplicate } = useMutation({
		mutationFn: (template: WorkflowTemplateRow) =>
			axios
				.post("/api/admin/workflow", {
					title: `${template.title ?? template.name} copy`,
					// The identifier is unique, so the copy needs its own.
					name: `${template.name}-copy-${Date.now().toString(36)}`,
					description: template.description ?? undefined,
					copyFromId: template.id,
				})
				.then((res) => res.data as { id: string }),
		onSuccess: () => {
			message.success("Template duplicated");
			queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
		},
		onError: () => message.error("Could not duplicate the template"),
	});

	const openReset = (template: WorkflowTemplateRow) => {
		const affected = (projectWorkflows ?? []).filter(
			(row) => row.template?.id === template.id,
		);
		if (!affected.length) {
			message.info("No project is using this template yet");
			return;
		}
		setResetTargets(
			affected.map((row) => ({
				id: row.id,
				projectName: row.project.name,
				templateId: template.id,
			})),
		);
	};

	const rows = useMemo(() => {
		const query = search.trim().toLowerCase();

		// Title or identifier — an admin looking for a template knows one or the
		// other, and the identifier is what task conditions refer to.
		const filtered = templates.filter((template) => {
			if (status !== "any" && template.status !== status) return false;
			if (!query) return true;
			return (
				(template.title ?? "").toLowerCase().includes(query) ||
				template.name.toLowerCase().includes(query)
			);
		});

		return [...filtered].sort((left, right) => {
			if (sort === "title") {
				return (left.title ?? left.name).localeCompare(
					right.title ?? right.name,
				);
			}
			if (sort === "used") return right.usedBy - left.usedBy;
			return dayjs(right.updatedAt).valueOf() - dayjs(left.updatedAt).valueOf();
		});
	}, [templates, search, status, sort]);

	const confirmDelete = (template: WorkflowTemplateRow) => {
		modal.confirm({
			title: `Delete “${template.title ?? template.name}”?`,
			content: template.usedBy
				? `${template.usedBy} project workflow(s) were created from this template. They keep their own steps — deleting the template does not touch them.`
				: "This cannot be undone.",
			okText: "Delete",
			okButtonProps: { danger: true },
			onOk: () => deleteTemplate(template.id),
		});
	};

	const exportJson = (template: WorkflowTemplateRow) => {
		// The row does not carry the steps — fetch the template itself so the file
		// is the template, not the summary the list happens to show.
		axios.get(`/api/admin/workflow/${template.id}`).then(({ data }) => {
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${template.name}.json`;
			link.click();
			URL.revokeObjectURL(url);
		});
	};

	const columns: ColumnsType<WorkflowTemplateRow> = [
		{
			title: "Template",
			dataIndex: "title",
			render: (_value, record) => (
				<Link href={`/admin/workflow/${record.id}`} className={styles.rowTitle}>
					<span className={styles.rowTitleText}>
						{record.title || record.name}
					</span>
					<span className={styles.rowSlug}>{record.name}</span>
				</Link>
			),
		},
		{
			title: "Steps",
			dataIndex: "stepCount",
			width: 100,
		},
		{
			title: "Tasks",
			dataIndex: "taskCount",
			width: 100,
		},
		{
			title: "Used by",
			dataIndex: "usedBy",
			width: 150,
			render: (usedBy: number) =>
				usedBy ? `${usedBy} project${usedBy === 1 ? "" : "s"}` : "—",
		},
		{
			title: "Status",
			dataIndex: "status",
			width: 140,
			render: (value: WorkflowTemplateRow["status"]) => (
				<Tag color={STATUS_META[value].color} variant="outlined">
					{STATUS_META[value].label}
				</Tag>
			),
		},
		{
			title: "Updated",
			dataIndex: "updatedAt",
			width: 150,
			render: (value: string) => dayjs(value).fromNow(),
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
								key: "open",
								icon: <IconExternalLink size={16} />,
								label: (
									<Link href={`/admin/workflow/${record.id}`}>
										Open template
									</Link>
								),
							},
							{
								key: "duplicate",
								icon: <IconCopy size={16} />,
								label: "Duplicate",
								onClick: () => duplicate(record),
							},
							{
								key: "export",
								icon: <IconDownload size={16} />,
								label: "Export as JSON",
								onClick: () => exportJson(record),
							},
							{ type: "divider" },
							{
								key: "reset",
								icon: <IconRefresh size={16} />,
								label: `Reset ${record.usedBy || "no"} project${
									record.usedBy === 1 ? "" : "s"
								} to this template…`,
								disabled: record.usedBy === 0,
								onClick: () => openReset(record),
							},
							{ type: "divider" },
							{
								key: "delete",
								icon: <IconTrash size={16} />,
								label: "Delete template",
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
			<div className={styles.toolbar}>
				<Input.Search
					allowClear
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search templates by title or identifier"
					className={styles.search}
				/>
				<Select
					value={status}
					onChange={setStatus}
					className={styles.filter}
					options={[
						{ value: "any", label: "Any status" },
						{ value: "active", label: "Active" },
						{ value: "unused", label: "Not in use" },
						{ value: "draft", label: "Draft" },
					]}
				/>
				<Select
					value={sort}
					onChange={setSort}
					className={styles.sort}
					options={[
						{ value: "updated", label: "Recently updated" },
						{ value: "title", label: "Title A–Z" },
						{ value: "used", label: "Most used" },
					]}
				/>
			</div>

			<ModernTable<WorkflowTemplateRow>
				rowKey="id"
				columns={columns}
				dataSource={rows}
				loading={loading}
				error={error}
				onRetry={onRetry}
				pagination={{ pageSize: 10, hideOnSinglePage: true }}
				emptyState={{
					title: "No templates found",
					description: "Templates matching your filters will appear here.",
				}}
			/>

			<ResetWorkflowModal
				targets={resetTargets}
				onClose={() => setResetTargets([])}
			/>
		</>
	);
}

export default WorkflowTemplatesTable;
