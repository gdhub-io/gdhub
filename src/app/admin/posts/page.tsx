"use client";

import { EllipsisOutlined } from "@ant-design/icons";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { FaDiscord } from "@react-icons/all-files/fa/FaDiscord";
import { FaLinkedinIn } from "@react-icons/all-files/fa/FaLinkedinIn";
import { FaTelegramPlane } from "@react-icons/all-files/fa/FaTelegramPlane";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { MenuProps } from "antd";
import {
	Button,
	Dropdown,
	Image,
	Modal,
	message,
	Popover,
	Row,
	Space,
	Spin,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateBlogPostModal } from "@/components/admin/CreateBlogPostModal";
import ModernTable from "@/components/ModernTable";
import { AdminLayout } from "@/layouts/AdminLayout";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

type AnnounceChannel = "linkedin" | "discord" | "telegram";

const channelLabels: Record<AnnounceChannel, string> = {
	linkedin: "LinkedIn",
	discord: "Discord",
	telegram: "Telegram",
};

export default function BlogPostsAdminPage() {
	const router = useRouter();
	const [showModal, setShowModal] = useState(false);
	const [postId, setPostId] = useState<string | undefined>(undefined);
	const {
		data: response,
		refetch: refetchPosts,
		isFetching,
	} = useQuery({
		queryKey: ["admin", "posts"],
		queryFn: () => axios.get("/api/admin/posts"),
		refetchOnWindowFocus: false,
	});
	const { mutateAsync: deletePost } = useMutation({
		mutationFn: ({ id }: { id: string }) =>
			axios.delete(`/api/admin/post/${id}`),
		onSuccess: () => {
			refetchPosts();
		},
	});

	const [preview, setPreview] = useState<{
		postId: string;
		channel: AnnounceChannel;
	} | null>(null);

	const {
		data: previewData,
		isFetching: isPreviewLoading,
		isError: isPreviewError,
		error: previewError,
	} = useQuery({
		queryKey: [
			"admin",
			"post-announce-preview",
			preview?.postId,
			preview?.channel,
		],
		queryFn: () =>
			axios
				.get<{
					channel: AnnounceChannel;
					message: string;
					image: string | null;
				}>(`/api/admin/post/${preview?.postId}/announce`, {
					params: { channel: preview?.channel },
				})
				.then((res) => res.data),
		enabled: Boolean(preview),
	});

	const { mutateAsync: announcePost, isPending: isPosting } = useMutation({
		mutationFn: ({ id, channel }: { id: string; channel: AnnounceChannel }) =>
			axios.post(`/api/admin/post/${id}/announce`, { channel }),
	});

	const handleConfirmAnnounce = async () => {
		if (!preview) return;
		const { channel } = preview;
		try {
			await announcePost({ id: preview.postId, channel });
			message.success(`Posted to ${channelLabels[channel]}`);
			setPreview(null);
		} catch (error) {
			const description = axios.isAxiosError(error)
				? error.response?.data?.error || error.message
				: "Unknown error";
			message.error(
				`Failed to post to ${channelLabels[channel]}: ${description}`,
			);
		}
	};

	const handleDelete = (recordId: string) => {
		Modal.confirm({
			title: "Are you sure you want to delete this post?",
			content: "This action cannot be undone.",
			okText: "Delete",
			okButtonProps: { danger: true },
			onOk: async () => {
				await deletePost({ id: recordId });
				setPostId(undefined);
			},
		});
	};

	const handleCreatePost = (id: string) => {
		setPostId(id);
		setShowModal(false);

		router.push(`/admin/post/${id}`);
	};

	const columns: ColumnsType<prismaClient.BlogPost> = [
		{
			title: "Title",
			dataIndex: "title",
			key: "title",
			render: (value, record) => (
				<Link href={`/admin/post/${record.id}`}>{value}</Link>
			),
		},
		{
			title: "Date",
			dataIndex: "publishedAt",
			key: "publishedAt",
			render: (value, data) =>
				data.status == prismaClient.BlogPostStatus.Draft ? (
					<Text type="secondary">not selected</Text>
				) : (
					dayjs(data.publishedAt).format("LLL")
				),
		},
		{
			title: "Authors",
			dataIndex: "authorIds",
			key: "authorIds",
			render: (value, data) =>
				data.authorIds ? (
					data.authorIds.map((id) => (
						<Link key={id} href={`/admin/user/${id}`}>
							{id}
						</Link>
					))
				) : (
					<Text type="secondary">not selected</Text>
				),
		},
		{ title: "Status", dataIndex: "status", key: "status" },
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
			align: "right",
			render(value, record) {
				const isPublished =
					record.status === prismaClient.BlogPostStatus.Published;

				const items: MenuProps["items"] = [
					{
						key: "open",
						label: (
							<Link href={`/blog/${record.slug}`} target="_blank">
								Go to post
							</Link>
						),
					},
					{ type: "divider" },
					{
						key: "linkedin",
						label: "Post to LinkedIn",
						icon: <FaLinkedinIn />,
						disabled: !isPublished || !record.slug,
					},
					{
						key: "discord",
						label: "Post to Discord",
						icon: <FaDiscord />,
						disabled: !isPublished || !record.slug,
					},
					{
						key: "telegram",
						label: "Post to Telegram",
						icon: <FaTelegramPlane />,
						disabled: !isPublished || !record.slug,
					},
					{ type: "divider" },
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
								domEvent.stopPropagation();
								if (key === "delete") {
									handleDelete(record.id);
								} else if (
									key === "linkedin" ||
									key === "discord" ||
									key === "telegram"
								) {
									setPreview({ postId: record.id, channel: key });
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
				<Row justify="space-between" align="middle">
					<Title level={2}>Blog posts</Title>
					<Button onClick={() => setShowModal(true)} type="primary">
						Add post
					</Button>
				</Row>
				<ModernTable
					loading={isFetching}
					dataSource={response?.data}
					columns={columns}
				/>
			</div>

			<CreateBlogPostModal
				open={showModal}
				onCancel={() => setShowModal(false)}
				onOk={handleCreatePost}
			/>

			<Modal
				open={Boolean(preview)}
				title={
					preview
						? `Announce preview — ${channelLabels[preview.channel]}`
						: "Announce preview"
				}
				onCancel={() => setPreview(null)}
				okText={preview ? `Post to ${channelLabels[preview.channel]}` : "Post"}
				okButtonProps={{ disabled: isPreviewLoading || isPreviewError }}
				confirmLoading={isPosting}
				onOk={handleConfirmAnnounce}
				destroyOnHidden
			>
				{isPreviewLoading ? (
					<div style={{ textAlign: "center", padding: 32 }}>
						<Spin />
					</div>
				) : isPreviewError ? (
					<Text type="danger">
						{axios.isAxiosError(previewError)
							? previewError.response?.data?.error || previewError.message
							: "Failed to build preview"}
					</Text>
				) : (
					<Space orientation="vertical" size={12} style={{ width: "100%" }}>
						<div
							style={{
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
								fontSize: 13,
								background: "rgba(0,0,0,0.04)",
								borderRadius: 8,
								padding: 12,
								maxHeight: 320,
								overflow: "auto",
							}}
						>
							{previewData?.message}
						</div>
						{previewData?.image ? (
							<Image
								src={previewData.image}
								alt="Announcement preview"
								style={{
									width: "100%",
									borderRadius: 8,
									border: "1px solid rgba(0,0,0,0.06)",
								}}
							/>
						) : null}
					</Space>
				)}
			</Modal>
		</AdminLayout>
	);
}
