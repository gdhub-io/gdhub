import { MoreOutlined } from "@ant-design/icons";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { FaChalkboardTeacher } from "@react-icons/all-files/fa/FaChalkboardTeacher";
import { FaMicroscope } from "@react-icons/all-files/fa/FaMicroscope";
import { FaRegCalendarCheck } from "@react-icons/all-files/fa/FaRegCalendarCheck";
import { FaUsers } from "@react-icons/all-files/fa/FaUsers";
import { GiGamepad } from "@react-icons/all-files/gi/GiGamepad";
import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import {
	Alert,
	Button,
	Dropdown,
	Flex,
	Grid,
	Image,
	type MenuProps,
	Modal,
	message,
	Select,
	Space,
	Tag,
	Typography,
	theme,
} from "antd";
import type { Breakpoint } from "antd/es/_util/responsiveObserver";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback } from "react";
import { formatEventPeriod } from "@/helpers/format";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const CreateEventButton = dynamic(
	() => import("@/components/events/CreateEventButton").then((m) => m.default),
	{ ssr: false },
);
const EventModal = dynamic(
	() => import("@/components/modals/EventModal").then((m) => m.default),
	{ ssr: false },
);
const CreateLocaleVersionModal = dynamic(
	() =>
		import("@/components/modals/CreateLocaleVersionModal").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const PageViews = dynamic(
	() =>
		import("@/components/PageViews").then((m) => m.PageViews).then((m) => m),
	{ ssr: false },
);
const ModernTable = dynamic(
	() => import("@/components/ModernTable").then((m) => m.ModernTable),
	{ ssr: false },
);

const { Text } = Typography;

function getTypeIcon(type: string, size = 20) {
	switch (type) {
		case "MEETUP":
			return <FaUsers size={size} />;
		case "GAMEJAM":
			return <GiGamepad size={size} />;
		case "WORKSHOP":
			return <FaChalkboardTeacher size={size} />;
		case "GAMELAB":
			return <FaMicroscope size={size} />;
		case "CONFERENCE":
			return <FaRegCalendarCheck size={size} />;
		default:
			return null;
	}
}

// Transform flat array of events into tree structure
function buildEventTree(events: any[]): any[] {
	if (!events || events.length === 0) {
		return [];
	}

	const eventMap = new Map<string, any>();
	const rootEvents: any[] = [];

	// First pass: create map and add key to each event
	events.forEach((event) => {
		eventMap.set(event.id, { ...event, key: event.id });
	});

	// Second pass: build tree structure
	events.forEach((event) => {
		const eventWithKey = eventMap.get(event.id);
		if (event.parentId && eventMap.has(event.parentId)) {
			const parent = eventMap.get(event.parentId);
			if (!parent.children) {
				parent.children = [];
			}
			parent.children.push(eventWithKey);
		} else {
			rootEvents.push(eventWithKey);
		}
	});

	return rootEvents;
}

const MyEventsPage: NextPageWithLayout = () => {
	const { t, getLanguage } = useTolgee();
	const router = useRouter();
	const [modal, modalContextHolder] = Modal.useModal();
	const { token } = theme.useToken();
	const screens = Grid.useBreakpoint();
	const [editModalOpen, setEditModalOpen] = React.useState(false);
	const [editingEvent, setEditingEvent] = React.useState<any | null>(null);
	const [localeModalOpen, setLocaleModalOpen] = React.useState(false);
	const [localeModalEventId, setLocaleModalEventId] = React.useState<
		string | null
	>(null);
	const [localeModalEventLang, setLocaleModalEventLang] =
		React.useState<prismaClient.$Enums.Language | null>(null);

	// Получение событий пользователя
	const {
		data,
		isLoading,
		refetch: refetchMyEvents,
	} = useQuery({
		queryKey: ["my-events"],
		queryFn: () => axios.get("/api/user/events").then((res) => res.data),
	});

	// Мутация для удаления события
	const { mutateAsync: deleteEvent } = useMutation({
		mutationFn: (id: string) => axios.delete(`/api/user/event/${id}`),
		onSuccess: () => {
			message.success(t("event.delete.success", "Event deleted"));
			refetchMyEvents();
		},
		onError: () => {
			message.error(t("event.delete.error", "Error deleting event"));
		},
	});

	const { mutateAsync: publishEvent, isPending: isPublishingEvent } =
		useMutation({
			mutationFn: (id: string) => axios.put(`/api/user/event/${id}/publish`),
			onSuccess: () => {
				message.success(t("event.publish.success", "Event published"));
				refetchMyEvents();
			},
			onError: () => {
				message.error(t("event.publish.error", "Error publishing event"));
			},
		});

	const handleEventPublish = async (id: string) => {
		try {
			await publishEvent(id);

			message.success(t("event.publish.success", "Event published"));
		} catch (error) {
			message.error(t("event.publish.error", "Error publishing event"));
		}
	};

	const { mutateAsync: unpublishEvent, isPending: isUnpublishingEvent } =
		useMutation({
			mutationFn: (id: string) => axios.put(`/api/user/event/${id}/unpublish`),
			onSuccess: () => {
				message.success(t("event.unpublish.success", "Event unpublished"));
				refetchMyEvents();
			},
			onError: () => {
				message.error(t("event.unpublish.error", "Error unpublishing event"));
			},
		});

	const { mutateAsync: restoreEvent, isPending: isRestoringEvent } =
		useMutation({
			mutationFn: (id: string) => axios.put(`/api/user/event/${id}/restore`),
			onSuccess: () => {
				message.success(t("event.restore.success", "Event is restored"));
				refetchMyEvents();
			},
			onError: () => {
				message.error(t("event.restore.error", "Error restoring event"));
			},
		});

	const { mutateAsync: generateSlug, isPending: isGeneratingSlug } =
		useMutation({
			mutationFn: (id: string) =>
				axios.put(`/api/user/event/${id}/generate-slug`),
			onSuccess: () => {
				message.success(t("event.generateSlug.success", "Slug generated"));
				refetchMyEvents();
			},
			onError: () => {
				message.error(t("event.generateSlug.error", "Error generating slug"));
			},
		});

	const handleEventRestore = async (id: string) => {
		await restoreEvent(id);
	};

	const handleEventUnpublish = async (id: string) => {
		await unpublishEvent(id);
	};

	const handleEdit = (id: string) => {
		const event = data?.find((e: any) => e.id === id);
		setEditingEvent(event);
		setEditModalOpen(true);
	};

	const handleEditModalCancel = () => {
		setEditModalOpen(false);
		setEditingEvent(null);
	};

	const handleEditModalSubmit = async () => {
		setEditModalOpen(false);
		setEditingEvent(null);
		await refetchMyEvents();

		message.success(t("event.edit.success", "Event edited successfully"));
	};

	const columns: ColumnsType<any> = [
		{
			title: t("event.title", "Title"),
			dataIndex: "title",
			key: "title",
			render: (value: string, record: any) => (
				<Flex align="center" gap={8}>
					{getTypeIcon(record.type)}
					<Text strong>{value}</Text>
				</Flex>
			),
			width: 300,
		},
		{
			title: t("event.cover", "Cover"),
			dataIndex: "image",
			key: "image",
			render: (value: string) =>
				value ? <Image src={value} alt="Cover" /> : null,
			responsive: ["md" as Breakpoint],
			width: 100,
		},
		{
			title: t("event.type", "Type"),
			dataIndex: "type",
			key: "type",
			render: (value: string) => <Text>{value}</Text>,
			responsive: ["md" as Breakpoint],
		},
		{
			title: t("event.lang", "Lang"),
			dataIndex: "lang",
			key: "lang",
			render: (value: prismaClient.$Enums.Language) => (
				<Tag bordered={false} color="blue">
					{value}
				</Tag>
			),
			responsive: ["md" as Breakpoint],
		},
		{
			title: t("event.dates", "Dates"),
			dataIndex: "schedule",
			key: "schedule",
			render: (schedule: any[]) => {
				if (!schedule || !schedule.length)
					return (
						<Alert
							message={t("event.noDates", "You need to set a schedule")}
							banner
							type="warning"
						/>
					);
				const first = schedule[0];
				const last = schedule[schedule.length - 1];
				return (
					<Text>
						{formatEventPeriod(first.startDate, last.endDate, getLanguage())}
					</Text>
				);
			},
			responsive: ["md" as Breakpoint],
		},
		{
			dataIndex: "slug",
			key: "slug",
			render: (value: string) =>
				!value ? (
					<Text type="secondary">{"-"}</Text>
				) : (
					<Link href={`/event/${value}`} target="_blank">
						<Button type="text" icon={<GoLinkExternal />} iconPosition="end">
							{t("event.goToEvent", "Go to event")}
						</Button>
					</Link>
				),
			responsive: ["md" as Breakpoint],
		},
		{
			dataIndex: "status",
			key: "status",
			width: 150,
			align: "right",
			render: (status: prismaClient.$Enums.EventStatus, record: any) => {
				const buttons = [];

				switch (status) {
					case prismaClient.$Enums.EventStatus.Draft:
						buttons.push(
							<Tag color="default">{t("event.status.draft", "Draft")}</Tag>,
						);
						break;
					case prismaClient.$Enums.EventStatus.Published:
						buttons.push(
							<Tag color="success">
								{t("event.status.published", "Published at {publishedAt}", {
									publishedAt: dayjs(record.publishedAt).format("lll"),
								})}
							</Tag>,
						);
						break;
					case prismaClient.$Enums.EventStatus.Archived:
						buttons.push(
							<Tag color="error">{t("event.status.archived", "Archived")}</Tag>,
						);
						break;
					case prismaClient.$Enums.EventStatus.Closed:
						buttons.push(
							<Tag color="error">{t("event.status.closed", "Closed")}</Tag>,
						);
				}

				buttons.push(
					<Button type="primary" href={`/my/events/${record.id}`}>
						{t("event.manage", "Manage")}
					</Button>,
				);

				return <Space>{buttons}</Space>;
			},
		},
		{
			title: t("event.pageViews", "Page views"),
			dataIndex: "slug",
			key: "page-views",
			align: "center",
			render: (id: string, record: any) => (
				<PageViews
					path={`/event/${record.slug}`}
					startDate={record.publishedAt}
				/>
			),
			responsive: ["md" as Breakpoint],
		},
		{
			key: "actions",
			width: 48,
			render: (_: any, record: any) => {
				const menu: MenuProps["items"] = [];

				if (!screens.md) {
					menu.push({
						key: "edit",
						label: t("event.edit", "Edit"),
						onClick: () => handleEdit(record.id),
					});
				}

				const startOfMenu: MenuProps["items"] = [
					{
						key: "generate-slug",
						label: t("event.generateSlug", "Generate Slug"),
						onClick: () =>
							Modal.confirm({
								title: t(
									"event.generateSlug.confirm",
									"Are you sure you want to generate a slug?",
								),
								content: (
									<Space>
										<Text>
											{t(
												"event.generateSlug.confirm",
												"Old link will no longer be available",
											)}
										</Text>
									</Space>
								),
								onOk: () => generateSlug(record.id),
								onCancel: () => {},
								okText: t("event.generateSlug.confirm", "Generate"),
								cancelText: t("event.generateSlug.cancel", "Cancel"),
							}),
					},
					{
						key: "new-locale-version",
						label: t("event.newLocale", "New Locale version"),
						onClick: () => {
							setLocaleModalEventId(record.id);
							setLocaleModalEventLang(record.lang);
							setLocaleModalOpen(true);
						},
					},
				];

				const endOfMenu: MenuProps["items"] = [
					{
						key: "divider",
						type: "divider",
					},
					{
						key: "delete",
						label: t("event.delete", "Delete"),
						danger: true,
						onClick: () =>
							modal.confirm({
								centered: true,
								title: t(
									"event.delete.confirm",
									"Are you sure you want to delete this event?",
								),
								content: (
									<Text>
										{t("event.delete.confirm", "This action cannot be undone")}
									</Text>
								),
								onOk: () => deleteEvent(record.id),
								onCancel: () => {},
							}),
					},
				];

				if (record.status === prismaClient.$Enums.EventStatus.Draft) {
					menu.push(...startOfMenu);
				}

				if (record.status === prismaClient.$Enums.EventStatus.Published) {
					menu.push(...startOfMenu);
					menu.push({
						key: "unpublish",
						label: t("event.unpublish", "Unpublish"),
						onClick: () => handleEventUnpublish(record.id),
					});
				}

				if (record.status === prismaClient.$Enums.EventStatus.Closed) {
					menu.push({
						key: "restore",
						label: t("event.restore", "Restore"),
						onClick: () => handleEventRestore(record.id),
					});
				}

				menu.push(...endOfMenu);

				return (
					<Dropdown menu={{ items: menu }} trigger={["click"]}>
						<Button type="text" icon={<MoreOutlined />} />
					</Dropdown>
				);
			},
		},
	];

	const handleLocaleModalCancel = () => {
		setLocaleModalOpen(false);
		setLocaleModalEventId(null);
		setLocaleModalEventLang(null);
	};

	const handleLocaleModalSuccess = () => {
		refetchMyEvents();
		setLocaleModalOpen(false);
		setLocaleModalEventId(null);
		setLocaleModalEventLang(null);
	};

	return (
		<ProtectedLayout
			title={t("page.myEvents.title", "My Events")}
			seo={{ openGraph: { type: "website", url: router.asPath } }}
			extra={<CreateEventButton onCreation={() => refetchMyEvents()} />}
			showBackButton
			backButtonUrl="/hub/events"
		>
			<div className={styles.container}>
				<ModernTable
					columns={columns}
					dataSource={data ? buildEventTree(data) : []}
					loading={isLoading}
					showHeader
					pagination={false}
					indentSize={30}
					childrenColumnName="children"
					defaultExpandAllRows
				/>
				<EventModal
					open={editModalOpen}
					eventId={editingEvent?.id}
					eventType={editingEvent?.type}
					initialValues={editingEvent}
					onCancel={handleEditModalCancel}
					onSubmit={handleEditModalSubmit}
				/>
				<CreateLocaleVersionModal
					open={localeModalOpen}
					eventId={localeModalEventId}
					currentLang={localeModalEventLang}
					onCancel={handleLocaleModalCancel}
					onSuccess={handleLocaleModalSuccess}
				/>
			</div>
			{modalContextHolder}
		</ProtectedLayout>
	);
};

export default MyEventsPage;
