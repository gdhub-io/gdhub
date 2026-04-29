import { IconTable } from "@tabler/icons-react";
import { Flex, List, Space, Typography } from "antd";
import axios from "axios";
import type { CurrentProject } from "@/hooks/project";

const { Text } = Typography;

export type ProjectDeletionImpactItem = {
	model: string;
	count: number;
	action: "delete" | "update" | "keep";
	description: string;
};

export type ProjectDeletionPreview = {
	projectId: string;
	canDelete: boolean;
	recommendedAction: "archive" | "delete";
	blockers: string[];
	currentWorkflowStep: {
		id: string;
		name: string;
		order: number;
	} | null;
	equity: {
		vestedAllocationsCount: number;
		unvestedPromisesCount: number;
		transactionsCount: number;
	};
	willDelete: ProjectDeletionImpactItem[];
	willUpdate: ProjectDeletionImpactItem[];
	willKeep: ProjectDeletionImpactItem[];
};

export type ProjectLifecycleModalProps = {
	open: boolean;
	project?: CurrentProject;
	onClose: () => void;
};

export const getErrorMessage = (error: unknown) => {
	if (axios.isAxiosError(error)) {
		return error.response?.data?.message || error.message;
	}

	return error instanceof Error ? error.message : "Unknown error";
};

export const getProjectDeletionPreview = (projectId: string | undefined) =>
	axios
		.get<ProjectDeletionPreview>("/api/user/project/lifecycle", {
			params: { id: projectId },
		})
		.then((res) => res.data);

export const renderImpactList = (
	items: ProjectDeletionImpactItem[] | undefined,
	emptyText: string,
) => {
	const visibleItems = (items || []).filter((item) => item.count > 0);

	if (!visibleItems.length) {
		return <Text type="secondary">{emptyText}</Text>;
	}

	return (
		<List
			size="small"
			dataSource={visibleItems}
			renderItem={(item) => (
				<List.Item style={{ paddingLeft: "0" }}>
					<Flex
						justify="space-between"
						align="center"
						style={{ width: "100%" }}
					>
						<Space align="center">
							<IconTable size={16} style={{ display: "flex" }} />
							<Text strong>{item.model}</Text>
						</Space>
						<Text>{item.count}</Text>
					</Flex>
				</List.Item>
			)}
		/>
	);
};
