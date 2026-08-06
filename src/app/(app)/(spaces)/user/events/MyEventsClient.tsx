"use client";

import type { Language } from "@gdhub-io/gdhub-prisma";
import {
	IconCalendarCheck,
	IconDeviceGamepad2,
	IconDotsVertical,
	IconExternalLink,
	IconMicroscope,
	IconPresentation,
	IconSettings,
	IconUsers,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import {
	Alert,
	Button,
	Card,
	Col,
	Dropdown,
	Flex,
	Grid,
	Image,
	type MenuProps,
	Modal,
	message,
	Row,
	Space,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import React from "react";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { EventStatus } from "@/config/prisma-enums";
import { formatEventPeriod } from "@/helpers/format";
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

const { Text } = Typography;

function getTypeIcon(type: string, size = 20) {
	switch (type) {
		case "MEETUP":
			return <IconUsers size={size} />;
		case "GAMEJAM":
			return <IconDeviceGamepad2 size={size} />;
		case "WORKSHOP":
			return <IconPresentation size={size} />;
		case "GAMELAB":
			return <IconMicroscope size={size} />;
		case "CONFERENCE":
			return <IconCalendarCheck size={size} />;
		default:
			return null;
	}
}

const MyEventsClient = () => {
	const { t, getLanguage } = useTolgee();
	const [modal, modalContextHolder] = Modal.useModal();
	const screens = Grid.useBreakpoint();
	const [editModalOpen, setEditModalOpen] = React.useState(false);
	const [editingEvent, setEditingEvent] = React.useState<any | null>(null);
	const [localeModalOpen, setLocaleModalOpen] = React.useState(false);
	const [localeModalEventId, setLocaleModalEventId] = React.useState<
		string | null
	>(null);
	const [localeModalEventLang, setLocaleModalEventLang] =
		React.useState<Language | null>(null);
	const [hoveredEventId, setHoveredEventId] = React.useState<string | null>(
		null,
	);

	// Fetch the user's events
	const {
		data,
		isLoading,
		refetch: refetchMyEvents,
	} = useQuery({
		queryKey: ["my-events"],
		queryFn: () => axios.get("/api/user/events").then((res) => res.data),
	});

	// Mutation for deleting an event
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

	const { mutateAsync: unpublishEvent } = useMutation({
		mutationFn: (id: string) => axios.put(`/api/user/event/${id}/unpublish`),
		onSuccess: () => {
			message.success(t("event.unpublish.success", "Event unpublished"));
			refetchMyEvents();
		},
		onError: () => {
			message.error(t("event.unpublish.error", "Error unpublishing event"));
		},
	});

	const { mutateAsync: restoreEvent } = useMutation({
		mutationFn: (id: string) => axios.put(`/api/user/event/${id}/restore`),
		onSuccess: () => {
			message.success(t("event.restore.success", "Event is restored"));
			refetchMyEvents();
		},
		onError: () => {
			message.error(t("event.restore.error", "Error restoring event"));
		},
	});

	const { mutateAsync: generateSlug } = useMutation({
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

	const getEventMenu = (record: any): MenuProps["items"] => {
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

		if (record.status === EventStatus.Draft) {
			menu.push(...startOfMenu);
		}

		if (record.status === EventStatus.Published) {
			menu.push(...startOfMenu);
			menu.push({
				key: "unpublish",
				label: t("event.unpublish", "Unpublish"),
				onClick: () => handleEventUnpublish(record.id),
			});
		}

		if (record.status === EventStatus.Closed) {
			menu.push({
				key: "restore",
				label: t("event.restore", "Restore"),
				onClick: () => handleEventRestore(record.id),
			});
		}

		menu.push(...endOfMenu);

		return menu;
	};

	const getStatusTag = (status: EventStatus, record: any) => {
		switch (status) {
			case EventStatus.Draft:
				return <Tag color="default">{t("event.status.draft", "Draft")}</Tag>;
			case EventStatus.Published:
				return (
					<Tag color="success">
						{t("event.status.published", "Published at {publishedAt}", {
							publishedAt: dayjs(record.publishedAt).format("lll"),
						})}
					</Tag>
				);
			case EventStatus.Archived:
				return (
					<Tag color="error">{t("event.status.archived", "Archived")}</Tag>
				);
			case EventStatus.Closed:
				return <Tag color="error">{t("event.status.closed", "Closed")}</Tag>;
			default:
				return null;
		}
	};

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

	const events = data || [];

	// Build mapping for parent-child relationships
	const eventRelations = React.useMemo(() => {
		const parentToChildren = new Map<string, string[]>();
		const childToParent = new Map<string, string>();

		events.forEach((event: any) => {
			if (event.parentId) {
				childToParent.set(event.id, event.parentId);
				if (!parentToChildren.has(event.parentId)) {
					parentToChildren.set(event.parentId, []);
				}
				parentToChildren.get(event.parentId)?.push(event.id);
			}
		});

		return { parentToChildren, childToParent };
	}, [events]);

	const getRelatedEventIds = (eventId: string): string[] => {
		const related: string[] = [];
		const children = eventRelations.parentToChildren.get(eventId) || [];
		const parent = eventRelations.childToParent.get(eventId);

		if (parent) {
			related.push(parent);
		}
		related.push(...children);

		return related;
	};

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("page.myEvents.title", "My Events")}
				extra={<CreateEventButton onCreation={() => refetchMyEvents()} />}
				showBackButton
				backButtonUrl="/hub/events"
			/>
			<div className={styles.container}>
				{isLoading ? (
					<Flex justify="center" align="center" style={{ minHeight: 200 }}>
						<Space size="large">
							<Card loading style={{ width: 300 }} />
							<Card loading style={{ width: 300 }} />
							<Card loading style={{ width: 300 }} />
						</Space>
					</Flex>
				) : events.length === 0 ? (
					<Alert
						title={t("event.noEvents", "No events found")}
						type="info"
						showIcon
					/>
				) : (
					<Row gutter={[16, 16]}>
						{events.map((event: any) => {
							const schedule = event.schedule || [];
							const hasSchedule = schedule.length > 0;
							const first = hasSchedule ? schedule[0] : null;
							const last = hasSchedule ? schedule[schedule.length - 1] : null;

							const isHovered = hoveredEventId === event.id;
							const relatedIds = hoveredEventId
								? getRelatedEventIds(hoveredEventId)
								: [];
							const isRelated = hoveredEventId
								? relatedIds.includes(event.id)
								: false;
							const isHighlighted = isHovered || isRelated;
							const isParent = eventRelations.parentToChildren.has(event.id);
							const isChild = !!event.parentId;

							const cardClassName = [
								isHighlighted
									? isHovered
										? styles.hoveredCard
										: styles.relatedCard
									: undefined,
								isHighlighted && isParent ? styles.parentLabel : undefined,
								isHighlighted && isChild ? styles.childLabel : undefined,
							]
								.filter(Boolean)
								.join(" ");

							return (
								<Col key={event.id} xs={24} sm={12} md={12} lg={8} xl={6}>
									<Card
										className={cardClassName || undefined}
										data-parent-label={t("event.parent", "Parent")}
										data-child-label={t("event.child", "Child")}
										onMouseEnter={() => setHoveredEventId(event.id)}
										onMouseLeave={() => setHoveredEventId(null)}
										cover={
											event.image ? (
												<Image
													src={event.image}
													alt={event.title}
													height={200}
													style={{ objectFit: "cover" }}
													preview={false}
												/>
											) : null
										}
										actions={[
											<Button
												key="manage"
												type="text"
												icon={<IconSettings />}
												href={`/user/event/${event.id}`}
												title={t("event.manage", "Manage")}
											/>,
											event.slug ? (
												<Button
													key="view"
													type="text"
													icon={<IconExternalLink />}
													href={`${event.lang ? `/${event.lang}` : ""}/event/${event.slug}`}
													target="_blank"
													title={t("event.view", "View")}
												/>
											) : (
												<Button
													key="view"
													type="text"
													icon={<IconExternalLink />}
													disabled
													title={t("event.view", "View")}
												/>
											),
											<Dropdown
												key="more"
												menu={{ items: getEventMenu(event) }}
												trigger={["click"]}
											>
												<Button type="text" block icon={<IconDotsVertical />} />
											</Dropdown>,
										]}
									>
										<Card.Meta
											avatar={getTypeIcon(event.type, 24)}
											title={
												<Text ellipsis style={{ fontWeight: 400 }}>
													{event.title}
												</Text>
											}
											description={
												<Space
													orientation="vertical"
													size="small"
													style={{ width: "100%" }}
												>
													{getStatusTag(event.status, event)}

													<Flex gap={8} wrap="wrap">
														<Tag bordered={false} color="blue">
															{event.lang}
														</Tag>
														<Tag bordered={false}>{event.type}</Tag>
													</Flex>
													{hasSchedule ? (
														<Text>
															{formatEventPeriod(
																first.startDate,
																last.endDate,
																getLanguage(),
															)}
														</Text>
													) : (
														<Alert
															title={t(
																"event.noDates",
																"You need to set a schedule",
															)}
															banner
															type="warning"
															style={{ marginTop: 8 }}
														/>
													)}
													{event.slug && event.publishedAt && (
														<PageViews
															path={`/event/${event.slug}`}
															locale={event.lang}
															isUnique={!!event.parentId}
															startDate={event.publishedAt}
															minViews={0}
														/>
													)}
												</Space>
											}
										/>
									</Card>
								</Col>
							);
						})}
					</Row>
				)}
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
		</div>
	);
};

export default MyEventsClient;
