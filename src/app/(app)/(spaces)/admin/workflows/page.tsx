"use client";

import type { WorkflowSchema } from "@gdhub-io/gdhub-prisma";
import { GoTrash } from "@react-icons/all-files/go/GoTrash";
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

const { Title, Text } = Typography;

export default function WorkflowsAdminPage() {
	const router = useRouter();
	const [showModal, setShowModal] = useState(false);
	const [workflowId, setWorkflowId] = useState<string | undefined>(undefined);

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

	const { mutateAsync: deleteWorkflow } = useMutation({
		mutationFn: ({ id }: { id: string }) =>
			axios.delete(`/api/admin/workflow/${id}`),
		onSuccess: () => {
			refetchWorkflows();
		},
	});

	const handleDelete = (recordId: string) => {
		deleteWorkflow({ id: recordId });
		setWorkflowId(undefined);
	};

	const handleCreateWorkflow = (id: string) => {
		setWorkflowId(id);
		setShowModal(false);
		router.push(`/admin/workflow/${id}`);
	};

	// Columns for workflow schemas (templates)
	const workflowColumns: ColumnsType<WorkflowSchema> = [
		{
			title: "Title",
			dataIndex: "title",
			key: "title",
			render: (value, record) => (
				<Link href={`/admin/workflow/${record.id}`}>{value}</Link>
			),
		},
		{
			title: "Created at",
			dataIndex: "createdAt",
			key: "createdAt",
			render: (value) => (
				<Popover content={dayjs(value).format("LLL")}>
					<Text>{dayjs(value).fromNow()}</Text>
				</Popover>
			),
		},
		{
			key: "actions",
			width: "1%",
			render(value, record) {
				return (
					<Space size="large">
						<Popconfirm
							title="Are you sure you want to delete this entry?"
							onConfirm={() => handleDelete(record.id)}
						>
							<Button type="text" danger icon={<GoTrash />} />
						</Popconfirm>
					</Space>
				);
			},
		},
	];

	// Columns for project workflows
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

	const tabItems = [
		{
			key: "templates",
			label: "Workflow templates",
			children: (
				<div>
					<Row
						justify="space-between"
						align="middle"
						style={{ marginBottom: 16 }}
					>
						<Title level={3}>Workflow templates</Title>
						<Button onClick={() => setShowModal(true)} type="primary">
							Add template
						</Button>
					</Row>
					<ModernTable
						loading={isFetchingWorkflows}
						dataSource={workflowsResponse?.data}
						columns={workflowColumns}
					/>
				</div>
			),
		},
		{
			key: "projects",
			label: "Project workflows",
			children: (
				<div>
					<Row
						justify="space-between"
						align="middle"
						style={{ marginBottom: 16 }}
					>
						<Title level={3}>Project workflows</Title>
					</Row>
					<ModernTable
						loading={isFetchingProjectWorkflows}
						dataSource={projectWorkflowsResponse?.data}
						columns={projectWorkflowColumns}
					/>
				</div>
			),
		},
	];

	return (
		<AdminSpace>
			<div className={styles.main}>
				<Title level={2}>Workflows</Title>
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
