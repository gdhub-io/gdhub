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
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CreateWorkflowModal } from "@/components/admin/CreateWorkflowModal";
import ModernTable from "@/components/ModernTable";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import {
	type ProjectWorkflowRow,
	ProjectWorkflowsTable,
} from "./ProjectWorkflowsTable";
import styles from "./style.module.scss";
import {
	type WorkflowTemplateRow,
	WorkflowTemplatesTable,
} from "./WorkflowTemplatesTable";

const { Title, Text } = Typography;

export default function WorkflowsAdminPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const tab = searchParams.get("tab") === "projects" ? "projects" : "templates";
	const [showModal, setShowModal] = useState(false);

	// Workflow schemas (templates)
	const {
		data: workflowsResponse,
		refetch: refetchWorkflows,
		isFetching: isFetchingWorkflows,
		isError: isWorkflowsError,
	} = useQuery({
		queryKey: ["admin", "workflows"],
		// The cache entry is shared with anything else asking for this key, so it
		// holds the payload rather than the transport's envelope.
		queryFn: () =>
			axios
				.get<WorkflowTemplateRow[]>("/api/admin/workflows")
				.then((res) => res.data),
		refetchOnWindowFocus: false,
	});

	// Project workflows
	const {
		data: projectWorkflowsResponse,
		refetch: refetchProjectWorkflows,
		isFetching: isFetchingProjectWorkflows,
		isError: isProjectWorkflowsError,
	} = useQuery({
		queryKey: ["admin", "project-workflows"],
		queryFn: () =>
			axios
				.get<ProjectWorkflowRow[]>("/api/admin/project-workflows")
				.then((res) => res.data),
		refetchOnWindowFocus: false,
	});

	const handleCreateWorkflow = (id: string) => {
		setShowModal(false);
		router.push(`/admin/workflow/${id}`);
	};

	const templates: WorkflowTemplateRow[] = workflowsResponse ?? [];
	const projectWorkflows: ProjectWorkflowRow[] = projectWorkflowsResponse ?? [];

	const tabItems = [
		{
			key: "templates",
			label: <TabLabel label="Workflow templates" count={templates.length} />,
			children: (
				<WorkflowTemplatesTable
					templates={templates}
					loading={isFetchingWorkflows}
					error={isWorkflowsError}
					onRetry={() => refetchWorkflows()}
				/>
			),
		},
		{
			key: "projects",
			label: (
				<TabLabel label="Project workflows" count={projectWorkflows.length} />
			),
			children: (
				<ProjectWorkflowsTable
					workflows={projectWorkflows}
					loading={isFetchingProjectWorkflows}
					error={isProjectWorkflowsError}
					onRetry={() => refetchProjectWorkflows()}
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

				{/* The tab is part of the address, so a breadcrumb or a shared link
				    can land on the list the reader meant. */}
				<Tabs
					activeKey={tab}
					items={tabItems}
					onChange={(key) =>
						router.replace(
							key === "templates"
								? "/admin/workflows"
								: `/admin/workflows?tab=${key}`,
							{ scroll: false },
						)
					}
				/>
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
