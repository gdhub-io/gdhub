"use client";

import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Table, Tag, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useState } from "react";
import { NewScoutModal } from "@/components/admin/NewScoutModal";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { LoadError } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { skeletonColumns, skeletonRows } from "@/components/ui/table";

const { Text } = Typography;

type Scout = {
	id: string;
	type: string;
	organizationName: string | null;
	website: string | null;
	isPublic: boolean;
	platforms: string[];
	genres: string[];
	stages: string[];
	createdAt: string;
	user: {
		id: string;
		name: string | null;
		email: string | null;
		image: string | null;
	};
	_count: { savedSearches: number };
};

export default function AdminScoutsPage() {
	const { t } = useTranslate();
	const [creating, setCreating] = useState(false);

	const {
		data: scouts = [],
		isFetching,
		isPending,
		isError,
		refetch,
	} = useQuery<Scout[]>({
		queryKey: ["admin", "scouts"],
		queryFn: () => axios.get("/api/admin/scouts").then((res) => res.data),
	});

	const columns = [
		{
			title: t("admin.scouts.column.representative", "Representative"),
			key: "user",
			render: (_: unknown, scout: Scout) => (
				<Flex align="center" gap={8}>
					<AppAvatar size={28} src={scout.user.image}>
						{scout.user.name?.charAt(0)}
					</AppAvatar>
					<Flex vertical>
						<Text strong>{scout.user.name}</Text>
						<Text type="secondary">{scout.user.email}</Text>
					</Flex>
				</Flex>
			),
		},
		{
			title: t("admin.scouts.column.organization", "Organization"),
			dataIndex: "organizationName",
			render: (name: string | null) => name ?? "—",
		},
		{
			title: t("admin.scouts.column.type", "Type"),
			dataIndex: "type",
			render: (type: string) => <Tag>{type}</Tag>,
		},
		{
			title: t("admin.scouts.column.focus", "Focus"),
			key: "focus",
			render: (_: unknown, scout: Scout) => {
				const focus = [...scout.platforms, ...scout.genres, ...scout.stages];
				return focus.length ? focus.join(" · ") : "—";
			},
		},
		{
			title: t("admin.scouts.column.public", "Public card"),
			dataIndex: "isPublic",
			render: (isPublic: boolean) => (isPublic ? "Yes" : "No"),
		},
		{
			title: t("admin.scouts.column.created", "Created"),
			dataIndex: "createdAt",
			render: (value: string) => dayjs(value).format("ll"),
		},
	];

	return (
		<AdminSpace>
			<div className="layout-background">
				<ProtectedPageHeader
					title={t("admin.scouts.title", "Scouts")}
					extra={
						<Button
							type="primary"
							icon={<IconPlus size={16} />}
							onClick={() => setCreating(true)}
						>
							{t("admin.scouts.new", "New scout")}
						</Button>
					}
				/>

				<Table
					rowKey="id"
					loading={!isPending && isFetching}
					columns={isPending ? skeletonColumns<Scout>(columns) : columns}
					dataSource={isPending ? skeletonRows<Scout>(5, "id") : scouts}
					pagination={false}
					locale={
						isError
							? { emptyText: <LoadError bare onRetry={() => refetch()} /> }
							: undefined
					}
				/>

				<NewScoutModal open={creating} onCancel={() => setCreating(false)} />
			</div>
		</AdminSpace>
	);
}
