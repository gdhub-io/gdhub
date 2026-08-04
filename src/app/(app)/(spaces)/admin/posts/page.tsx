"use client";

import type { BlogPost } from "@gdhub-io/gdhub-prisma";
import {
	IconBrandDiscord,
	IconBrandLinkedin,
	IconBrandTelegram,
	IconDots,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { MenuProps } from "antd";
import { Button, Dropdown, Modal, Popover, Row, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	AnnouncePreviewModal,
	type AnnounceTarget,
} from "@/components/admin/AnnouncePreviewModal";
import { CreateBlogPostModal } from "@/components/admin/CreateBlogPostModal";
import ModernTable from "@/components/ModernTable";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { BlogPostStatus } from "@/config/prisma-enums";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

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

	const [announceTarget, setAnnounceTarget] = useState<AnnounceTarget | null>(
		null,
	);

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

	const columns: ColumnsType<BlogPost> = [
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
				data.status == BlogPostStatus.Draft ? (
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
				const isPublished = record.status === BlogPostStatus.Published;

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
						icon: <IconBrandLinkedin />,
						disabled: !isPublished || !record.slug,
					},
					{
						key: "discord",
						label: "Post to Discord",
						icon: <IconBrandDiscord />,
						disabled: !isPublished || !record.slug,
					},
					{
						key: "telegram",
						label: "Post to Telegram",
						icon: <IconBrandTelegram />,
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
									setAnnounceTarget({
										apiPath: `/api/admin/post/${record.id}/announce`,
										channel: key,
									});
								}
							},
						}}
					>
						<Button type="text" icon={<IconDots />} />
					</Dropdown>
				);
			},
		},
	];

	return (
		<AdminSpace>
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

			<AnnouncePreviewModal
				target={announceTarget}
				onClose={() => setAnnounceTarget(null)}
			/>
		</AdminSpace>
	);
}
