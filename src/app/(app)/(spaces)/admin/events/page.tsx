"use client";

import type { Event, User } from "@gdhub-io/gdhub-prisma";
import {
	IconBrandDiscord,
	IconBrandLinkedin,
	IconBrandTelegram,
	IconDots,
	IconEye,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { MenuProps } from "antd";
import {
	App,
	Button,
	Card,
	Dropdown,
	Flex,
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
import {
	AnnouncePreviewModal,
	type AnnounceTarget,
} from "@/components/admin/AnnouncePreviewModal";
import ModernTable from "@/components/ModernTable";
import { PageViews } from "@/components/PageViews";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { StatusDot, type StatusTone } from "@/components/ui";
import { EventStatus, EventType } from "@/config/prisma-enums";
import { formatEventPeriod } from "@/helpers/format";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

type AdminEvent = Event & {
	createdBy: Pick<User, "id" | "name" | "image"> | null;
	schedule: Array<{ startDate: string; endDate: string }>;
	_count: { members: number };
};

const STATUS_TONE: Record<string, StatusTone> = {
	[EventStatus.Published]: "success",
	[EventStatus.Draft]: "neutral",
	[EventStatus.Archived]: "danger",
	[EventStatus.Closed]: "danger",
};

const DefaultCover = ({ title }: { title: string }) => (
	<Flex align="center" justify="center" className={styles.defaultCover}>
		{(title || "?").charAt(0).toUpperCase()}
	</Flex>
);

export default function EventsAdminPage() {
	const { modal } = App.useApp();

	const [status, setStatus] = useState<string>();
	const [type, setType] = useState<string>();
	const [announceTarget, setAnnounceTarget] = useState<AnnounceTarget | null>(
		null,
	);

	const {
		data: events,
		refetch,
		isFetching,
	} = useQuery<AdminEvent[]>({
		queryKey: ["admin", "events", status, type],
		queryFn: () =>
			axios
				.get<AdminEvent[]>("/api/admin/events", {
					params: { status, type },
				})
				.then((res) => res.data),
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: deleteEvent } = useMutation({
		mutationFn: (id: string) => axios.delete(`/api/admin/event/${id}`),
		onSuccess: async () => {
			message.success("Event deleted");
			await refetch();
		},
		onError: () => message.error("Could not delete the event"),
	});

	const handleDelete = (record: AdminEvent) => {
		modal.confirm({
			centered: true,
			title: "Delete this event?",
			content: `"${record.title}", its schedule and its ${record._count.members} member(s) go with it. This cannot be undone.`,
			okText: "Delete",
			okButtonProps: { danger: true },
			onOk: () => deleteEvent(record.id),
		});
	};

	const columns: ColumnsType<AdminEvent> = [
		{
			title: "Cover",
			dataIndex: "image",
			key: "cover",
			width: 104,
			render: (image, record) =>
				image ? (
					<Image
						src={image}
						alt={record.title}
						width={80}
						height={45}
						unoptimized
						className={styles.cover}
					/>
				) : (
					<DefaultCover title={record.title} />
				),
		},
		{
			title: "Event",
			dataIndex: "title",
			key: "title",
			width: 280,
			render: (title, record) => (
				<Space orientation="vertical" size={2} className={styles.titleCell}>
					<Text strong>{title}</Text>
					<Text
						type="secondary"
						ellipsis={{ tooltip: record.shortDescription }}
					>
						{record.type}
						{record.shortDescription ? ` · ${record.shortDescription}` : ""}
					</Text>
				</Space>
			),
		},
		{
			title: "Organiser",
			dataIndex: "createdBy",
			key: "createdBy",
			render: (createdBy) =>
				createdBy?.name ? (
					<Text>{createdBy.name}</Text>
				) : (
					<Text type="secondary">Unknown</Text>
				),
		},
		{
			title: "When",
			key: "when",
			render: (_, record) => {
				const schedule = record.schedule ?? [];
				if (!schedule.length) return <Text type="secondary">No schedule</Text>;

				return (
					<Text style={{ whiteSpace: "nowrap" }}>
						{formatEventPeriod(
							schedule[0].startDate,
							schedule[schedule.length - 1].endDate,
							"en",
							"day",
						)}
					</Text>
				);
			},
		},
		{
			title: "Status",
			dataIndex: "status",
			key: "status",
			render: (value) => (
				<StatusDot tone={STATUS_TONE[value] ?? "neutral"} label={value} />
			),
		},
		{
			title: "Members",
			key: "members",
			align: "center",
			render: (_, record) => record._count.members,
		},
		{
			title: "Views",
			key: "views",
			// Nothing to count before the page exists.
			render: (_, record) =>
				record.slug && record.publishedAt ? (
					<PageViews
						path={`/event/${record.slug}`}
						locale={record.lang}
						startDate={dayjs(record.publishedAt).format("YYYY-MM-DD")}
						minViews={0}
					/>
				) : (
					<Text type="secondary">—</Text>
				),
		},
		{
			title: "Page",
			key: "page",
			render: (_, record) =>
				record.slug && record.status === EventStatus.Published ? (
					<Link href={`/event/${record.slug}`} target="_blank">
						<Button type="link" icon={<IconEye />}>
							Open
						</Button>
					</Link>
				) : (
					<Text type="secondary">Not public</Text>
				),
		},
		{
			key: "actions",
			width: "1%",
			align: "right",
			render: (_, record) => {
				// An announcement is a link to a public page, so a draft has nothing to
				// announce — the API refuses it too, this only saves the round trip.
				const isPublic =
					record.status === EventStatus.Published && !!record.slug;

				const items: MenuProps["items"] = [
					...(isPublic
						? ([
								{
									key: "open",
									label: (
										<Link href={`/event/${record.slug}`} target="_blank">
											Open page
										</Link>
									),
								},
								{ type: "divider" },
								{
									key: "linkedin",
									label: "Post to LinkedIn",
									icon: <IconBrandLinkedin />,
								},
								{
									key: "discord",
									label: "Post to Discord",
									icon: <IconBrandDiscord />,
								},
								{
									key: "telegram",
									label: "Post to Telegram",
									icon: <IconBrandTelegram />,
								},
								{ type: "divider" },
							] satisfies MenuProps["items"])
						: []),
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
								// "open" is a plain link — let its default navigation through.
								if (key === "open") return;

								domEvent.preventDefault();
								domEvent.stopPropagation();

								if (key === "delete") {
									handleDelete(record);
								} else if (
									key === "linkedin" ||
									key === "discord" ||
									key === "telegram"
								) {
									setAnnounceTarget({
										apiPath: `/api/admin/event/${record.id}/announce`,
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
				<Title level={2}>Events</Title>
				<Card size="small" title="Filters" style={{ marginBottom: 16 }}>
					<Flex gap={12} wrap="wrap">
						<div className={styles.filter}>
							<Text type="secondary" className={styles.filterLabel}>
								Status
							</Text>
							<Select
								allowClear
								variant="filled"
								placeholder="Any status"
								value={status}
								style={{ width: "100%" }}
								options={Object.values(EventStatus).map((value) => ({
									value,
									label: value,
								}))}
								onChange={setStatus}
							/>
						</div>
						<div className={styles.filter}>
							<Text type="secondary" className={styles.filterLabel}>
								Type
							</Text>
							<Select
								allowClear
								variant="filled"
								placeholder="Any type"
								value={type}
								style={{ width: "100%" }}
								options={Object.values(EventType).map((value) => ({
									value,
									label: value,
								}))}
								onChange={setType}
							/>
						</div>
					</Flex>
				</Card>
				<ModernTable<AdminEvent>
					loading={isFetching}
					rowKey="id"
					dataSource={events}
					columns={columns}
				/>
			</div>

			<AnnouncePreviewModal
				target={announceTarget}
				onClose={() => setAnnounceTarget(null)}
			/>
		</AdminSpace>
	);
}
