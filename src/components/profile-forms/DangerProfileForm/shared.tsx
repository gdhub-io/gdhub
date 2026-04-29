import { IconTable } from "@tabler/icons-react";
import { Flex, List, Space, Typography } from "antd";
import axios from "axios";

const { Text } = Typography;

export type UserDeletionImpactItem = {
	model: string;
	count: number;
	description: string;
};

export type UserDeletionPreview = {
	userId: string;
	canHardDeleteUser: false;
	recommendedAction: "anonymize";
	blockers: string[];
	willDelete: UserDeletionImpactItem[];
	willAnonymize: UserDeletionImpactItem[];
	willDetach: UserDeletionImpactItem[];
	willKeep: UserDeletionImpactItem[];
};

export const getErrorMessage = (error: unknown) => {
	if (axios.isAxiosError(error)) {
		return error.response?.data?.message || error.message;
	}

	return error instanceof Error ? error.message : "Unknown error";
};

export const getUserDeletionPreview = () =>
	axios
		.get<UserDeletionPreview>("/api/user/privacy", {
			params: { action: "prepare-delete" },
		})
		.then((res) => res.data);

export const renderImpactList = (
	items: UserDeletionImpactItem[] | undefined,
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
