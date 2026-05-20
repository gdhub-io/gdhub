"use client";

import { EllipsisOutlined, EyeOutlined } from "@ant-design/icons";
import type { OutputData } from "@editorjs/editorjs";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { MenuProps } from "antd";
import {
	Button,
	Card,
	Dropdown,
	Flex,
	Modal,
	message,
	Select,
	Space,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ModernTable from "@/components/ModernTable";
import { PageViews } from "@/components/PageViews";
import {
	getCleanTextContent,
	getEditorjsPageCover,
	getEditorjsShortContent,
	getPageCover,
} from "@/helpers/content";
import { AdminLayout } from "@/layouts/AdminLayout";
import styles from "@/pages/admin/devlog-posts/style.module.scss";

const { Title, Text } = Typography;

type AdminDevlogPost = prismaClient.ProjectReport & {
	project: Pick<prismaClient.Project, "id" | "name" | "slug" | "coverImage">;
	author: Pick<prismaClient.User, "id" | "name" | "image"> | null;
};

type AdminProjectOption = Pick<prismaClient.Project, "id" | "name" | "slug">;

const DefaultCover = ({ title }: { title: string }) => (
	<Flex
		align="center"
		justify="center"
		style={{
			width: 80,
			height: 45,
			borderRadius: 8,
			background:
				"linear-gradient(135deg, rgba(24,144,255,0.16), rgba(82,196,26,0.12))",
			fontWeight: 700,
			fontSize: 18,
		}}
	>
		{(title || "?").charAt(0).toUpperCase()}
	</Flex>
);

export default function DevlogPostsAdminPage() {
	const [selectedProjectId, setSelectedProjectId] = useState<string>();

	const { data: projects, isFetching: isFetchingProjects } = useQuery<
		AdminProjectOption[]
	>({
		queryKey: ["admin", "projects"],
		queryFn: () =>
			axios
				.get<AdminProjectOption[]>("/api/admin/projects")
				.then((res) => res.data),
		refetchOnWindowFocus: false,
	});

	const {
		data: posts,
		refetch,
		isFetching,
	} = useQuery<AdminDevlogPost[]>({
		queryKey: ["admin", "devlog-posts", selectedProjectId],
		queryFn: () =>
			axios
				.get<AdminDevlogPost[]>("/api/admin/devlog-posts", {
					params: selectedProjectId
						? { projectId: selectedProjectId }
						: undefined,
				})
				.then((res) => res.data),
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: deletePost } = useMutation({
		mutationFn: (id: string) => axios.delete(`/api/admin/devlog-post/${id}`),
		onSuccess: async () => {
			message.success("Post deleted");
			await refetch();
		},
	});

	const handleDelete = (id: string) => {
		Modal.confirm({
			title: "Delete this DevLog post?",
			content: "This action cannot be undone.",
			okText: "Delete",
			okButtonProps: { danger: true },
			onOk: async () => {
				await deletePost(id);
			},
		});
	};

	const columns: ColumnsType<AdminDevlogPost> = [
		{
			title: "Preview",
			dataIndex: "id",
			key: "preview",
			width: 104,
			render: (_, record) => {
				const coverSrc =
					(record.contentEditor
						? getEditorjsPageCover(
								record.contentEditor as unknown as OutputData,
							)
						: getPageCover(record)) || record.project?.coverImage;

				if (!coverSrc) {
					return <DefaultCover title={record.project?.name || ""} />;
				}

				return (
					<Image
						src={coverSrc}
						alt={record.project?.name || "DevLog cover"}
						width={80}
						height={45}
						unoptimized
						style={{
							borderRadius: 8,
							objectFit: "cover",
							aspectRatio: "16 / 9",
						}}
					/>
				);
			},
		},
		{
			title: "Content",
			dataIndex: "contentEditor",
			key: "content",
			width: 260,
			render: (contentEditor, record) => {
				const previewText = contentEditor
					? getEditorjsShortContent(contentEditor as OutputData, 140)
					: getCleanTextContent(record.content, 140);

				return (
					<Space
						direction="vertical"
						size={2}
						style={{ maxWidth: 260, width: "100%" }}
					>
						<Text strong>{record.project?.name || "Unknown project"}</Text>
						<Text
							type="secondary"
							ellipsis={{ tooltip: previewText }}
							style={{ maxWidth: 260 }}
						>
							{previewText || "No text content"}
						</Text>
					</Space>
				);
			},
		},
		{
			title: "Author",
			dataIndex: "author",
			key: "author",
			render: (author) =>
				author?.name ? (
					<Text>{author.name}</Text>
				) : (
					<Text type="secondary">Unknown author</Text>
				),
		},
		{
			title: "Published At",
			dataIndex: "publishedAt",
			key: "publishedAt",
			render: (value) => dayjs(value).format("LLL"),
		},
		{
			title: "Views",
			dataIndex: "id",
			key: "views",
			render: (id, record) => (
				<PageViews
					path={`/devlog/${id}`}
					startDate={dayjs(record.publishedAt).format("YYYY-MM-DD")}
					minViews={0}
				/>
			),
		},
		{
			title: "Post",
			dataIndex: "id",
			key: "post",
			render: (id) => (
				<Link href={`/devlog/${id}`} target="_blank">
					<Button type="link" icon={<EyeOutlined />}>
						Open
					</Button>
				</Link>
			),
		},
		{
			key: "actions",
			width: "1%",
			align: "right",
			render: (_, record) => {
				const items: MenuProps["items"] = [
					{
						key: "open",
						label: (
							<Link href={`/devlog/${record.id}`} target="_blank">
								Open post
							</Link>
						),
					},
					{
						key: "delete",
						label: "Delete",
						danger: true,
						icon: <IconTrash size={14} />,
					},
				];

				return (
					<Dropdown
						trigger={["click"]}
						menu={{
							items,
							onClick: ({ key, domEvent }) => {
								if (key === "delete") {
									domEvent.preventDefault();
									domEvent.stopPropagation();
									handleDelete(record.id);
								}
							},
						}}
					>
						<Button type="text" icon={<EllipsisOutlined />} />
					</Dropdown>
				);
			},
		},
	];

	return (
		<AdminLayout>
			<div className={styles.main}>
				<Title level={2}>DevLog Posts</Title>
				<Card size="small" title="Filters" style={{ marginBottom: 16 }}>
					<Flex gap={12} wrap="wrap">
						<div style={{ minWidth: 280, maxWidth: 420, width: "100%" }}>
							<Text
								type="secondary"
								style={{ display: "block", marginBottom: 8 }}
							>
								Project
							</Text>
							<Select
								allowClear
								showSearch
								variant="filled"
								placeholder="All projects"
								value={selectedProjectId}
								loading={isFetchingProjects}
								optionFilterProp="label"
								style={{ width: "100%" }}
								options={projects?.map((project) => ({
									value: project.id,
									label: project.name || project.slug || project.id,
								}))}
								onChange={(value) => setSelectedProjectId(value)}
							/>
						</div>
					</Flex>
				</Card>
				<ModernTable<AdminDevlogPost>
					loading={isFetching}
					rowKey="id"
					dataSource={posts}
					columns={columns}
				/>
			</div>
		</AdminLayout>
	);
}
