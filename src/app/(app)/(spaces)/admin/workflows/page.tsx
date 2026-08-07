"use client";

import type { WorkflowSchema } from "@gdhub-io/gdhub-prisma";
import { IconPlus } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Button,
	Popconfirm,
	Popover,
	Row,
	Space,
	Tabs,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateWorkflowModal } from "@/components/admin/CreateWorkflowModal";
import ModernTable from "@/components/ModernTable";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import styles from "./style.module.scss";
import {
	type WorkflowTemplateRow,
	WorkflowTemplatesTable,
} from "./WorkflowTemplatesTable";

const { Title, Text } = Typography;

export default function WorkflowsAdminPage() {
	const router = useRouter();
	const [showModal, setShowModal] = useState(false);

	// Workflow schemas (templates)
	const {
		data: workflowsResponse,
		refetch: refetchWorkflows,
		isFetching: isFetchingWorkflows,
	} = useQuery({
		queryKey: ["admin", "workflows"],
		queryFn: () => axios.get("/api/admin/workflows"),
		refetchOnWindowFocus: false,
	});

	// Project workflows
	const {
		data: projectWorkflowsResponse,
		refetch: refetchProjectWorkflows,
		isFetching: isFetchingProjectWorkflows,
	} = useQuery({
		queryKey: ["admin", "project-workflows"],
		queryFn: () => axios.get("/api/admin/project-workflows"),
		refetchOnWindowFocus: false,
	});

	const handleCreateWorkflow = (id: string) => {
		setShowModal(false);
		router.push(`/admin/workflow/${id}`);
	};

	// Columns for workflow schemas (templates)
	const projectWorkflowColumns: ColumnsType<any> = [
		{
			title: "Project",
			dataIndex: ["project", "name"],
			key: "projectName",
			width: "20%",
			render: (value, record) => (
				<div>
					<Link href={`/admin/project-workflow/${record.id}`}>
						<strong>{value}</strong>
					</Link>
					<div>
						<Text type="secondary" style={{ fontSize: "12px" }}>
							by {record.project?.author?.name}
						</Text>
					</div>
				</div>
			),
		},
		{
			title: "Current Stage",
			key: "currentStage",
			width: "15%",
			render: (_, record) => (
				<div>
					<div style={{ fontWeight: "bold", color: "var(--gd-info-solid)" }}>
						{record.analytics?.currentStepName || "Not started"}
					</div>
					<Text type="secondary" style={{ fontSize: "12px" }}>
						Step {(record.analytics?.currentStepOrder || 0) + 1} of{" "}
						{record.analytics?.totalSteps || 0}
					</Text>
				</div>
			),
		},
		{
			title: "Tasks Progress",
			key: "tasksProgress",
			width: "15%",
			render: (_, record) => {
				const percentage = record.analytics?.completionPercentage || 0;
				const completed = record.analytics?.completedTasks || 0;
				const total = record.analytics?.totalTasks || 0;

				return (
					<div style={{ textAlign: "center" }}>
						<div
							style={{
								fontSize: "16px",
								fontWeight: "bold",
								color:
									percentage >= 80
										? "var(--gd-success-solid)"
										: percentage >= 50
											? "var(--gd-warning-solid)"
											: "var(--gd-danger-solid)",
							}}
						>
							{completed}/{total}
						</div>
						<Text type="secondary" style={{ fontSize: "12px" }}>
							{percentage}% done
						</Text>
					</div>
				);
			},
		},
		{
			title: "Time Active",
			key: "timeActive",
			width: "12%",
			render: (_, record) => {
				const days = record.analytics?.daysInProgress || 0;
				return (
					<div style={{ textAlign: "center" }}>
						<div
							style={{
								fontSize: "18px",
								fontWeight: "bold",
								color: "var(--gd-color-link)",
							}}
						>
							{days}
						</div>
						<Text type="secondary" style={{ fontSize: "11px" }}>
							{days === 1 ? "day" : "days"}
						</Text>
					</div>
				);
			},
		},
		{
			title: "Workflow",
			dataIndex: "title",
			key: "workflowTitle",
			width: "15%",
			render: (value) => (
				<div style={{ fontSize: "13px" }}>
					{value || <Text type="secondary">No title</Text>}
				</div>
			),
		},
		{
			title: "Created",
			dataIndex: "createdAt",
			key: "createdAt",
			width: "12%",
			render: (value) => (
				<Popover content={dayjs(value).format("LLLL")}>
					<div style={{ fontSize: "12px" }}>
						{dayjs(value).format("DD/MM/YY")}
					</div>
				</Popover>
			),
		},
		{
			title: "Actions",
			key: "actions",
			width: "8%",
			render: (_, record) => (
				<Link href={`/admin/project-workflow/${record.id}`}>
					<Button type="primary" size="small">
						Edit
					</Button>
				</Link>
			),
		},
	];

	const templates: WorkflowTemplateRow[] = workflowsResponse?.data ?? [];
	const projectWorkflows = projectWorkflowsResponse?.data ?? [];

	const tabItems = [
		{
			key: "templates",
			label: <TabLabel label="Workflow templates" count={templates.length} />,
			children: (
				<WorkflowTemplatesTable
					templates={templates}
					loading={isFetchingWorkflows}
				/>
			),
		},
		{
			key: "projects",
			label: (
				<TabLabel label="Project workflows" count={projectWorkflows.length} />
			),
			children: (
				<ModernTable
					loading={isFetchingProjectWorkflows}
					dataSource={projectWorkflows}
					columns={projectWorkflowColumns}
				/>
			),
		},
	];

	return (
		<AdminSpace>
			<div className={styles.main}>
				<div className={styles.pageHeader}>
					<div className={styles.titles}>
						<Title level={2} className={styles.pageTitle}>
							Workflows
						</Title>
						<Text type="secondary" className={styles.pageSubtitle}>
							Templates define the path a project follows. A project keeps its
							own copy, so editing a template never rewrites work already under
							way.
						</Text>
					</div>
					<Button
						type="primary"
						icon={<IconPlus size={14} />}
						onClick={() => setShowModal(true)}
					>
						New template
					</Button>
				</div>

				<Tabs defaultActiveKey="templates" items={tabItems} />
			</div>

			<CreateWorkflowModal
				open={showModal}
				onCancel={() => setShowModal(false)}
				onOk={handleCreateWorkflow}
			/>
		</AdminSpace>
	);
}

/** Tab title with the number of rows behind it. */
function TabLabel({ label, count }: { label: string; count: number }) {
	return (
		<span className={styles.tabLabel}>
			{label}
			<span className={styles.tabCount}>{count}</span>
		</span>
	);
}
