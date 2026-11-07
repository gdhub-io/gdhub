"use client";

import type { Language } from "@gdhub-io/gdhub-prisma";
import { IconExternalLink, IconPencil } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import {
	Alert,
	Card,
	Col,
	Flex,
	type MenuProps,
	Modal,
	message,
	Row,
	Space,
} from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import React, { useMemo } from "react";
import { MyEventCard } from "@/components/events/MyEventCard";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { useSetSpaceHeader } from "@/components/layouts/SpaceHeader";
import { LoadError } from "@/components/ui";
import { ViewCount } from "@/components/ViewCount";
import { EventStatus } from "@/config/prisma-enums";
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

const MyEventsClient = () => {
	const { t } = useTolgee();

	// A list page is not a space, but it is still "where you are": the trail
	// names it after the logo, with no switcher because there is nothing here
	// to switch between.
	useSetSpaceHeader(
		useMemo(
			() => ({
				trail: { current: { label: t("hub.menu.my-events", "My events") } },
			}),
			[t],
		),
	);
	const [modal, modalContextHolder] = Modal.useModal();
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
		isLoadingError,
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
		// The card shows one button — Manage. Everything the old three-icon footer
		// offered lives here, so nothing was lost in the move.
		const menu: MenuProps["items"] = [
			{
				key: "edit",
				label: t("event.edit", "Edit"),
				icon: <IconPencil size={15} />,
				onClick: () => handleEdit(record.id),
			},
			{
				key: "view",
				label: t("event.view", "View"),
				icon: <IconExternalLink size={15} />,
				disabled: !record.slug,
				onClick: () => window.open(`/event/${record.slug}`, "_blank"),
			},
			{ key: "view-divider", type: "divider" },
		];

		const startOfMenu: MenuProps["items"] = [
			{
				key: "generate-slug",
				label: t("event.generateSlug", "Generate Slug"),
				// `modal` from the hook, not the static `Modal.confirm`: the static
				// method mounts its own React root outside the ConfigProvider, so it
				// came up in antd's stock blue instead of the app's theme.
				onClick: () =>
					modal.confirm({
						centered: true,
						title: t(
							"event.generateSlug.confirm.title",
							"Generate a new link?",
						),
						content: t(
							"event.generateSlug.confirm.body",
							"The current link will stop working, and anywhere it was shared will lead nowhere.",
						),
						okText: t("event.generateSlug.confirm.ok", "Generate"),
						cancelText: t("common.cancel", "Cancel"),
						onOk: () => generateSlug(record.id),
					}),
			},
			{
				key: "new-locale-version",
				label: t("event.newLocale", "New Locale version"),
				// Off while the platform is English-only — the same reason the Language
				// field in event settings is disabled. The modal below stays wired up,
				// so re-enabling is one line.
				disabled: true,
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
						// One key was doing duty as both the title and the body, so a
						// translated build showed the same sentence twice.
						title: t("event.delete.confirm.title", "Delete this event?"),
						content: t(
							"event.delete.confirm.body",
							"The event, its schedule and its members go with it. This cannot be undone.",
						),
						okText: t("common.delete", "Delete"),
						okButtonProps: { danger: true },
						cancelText: t("common.cancel", "Cancel"),
						onOk: () => deleteEvent(record.id),
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
				) : isLoadingError ? (
					<LoadError
						title={t("page.myEvents.error", "Your events could not be loaded")}
						onRetry={refetchMyEvents}
					/>
				) : events.length === 0 ? (
					<Alert
						title={t("event.noEvents", "No events found")}
						type="info"
						showIcon
					/>
				) : (
					<Row gutter={[16, 16]}>
						{events.map((event: any) => {
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
								<Col key={event.id} xs={24} sm={12} lg={8} xxl={6}>
									<MyEventCard
										event={event}
										menu={getEventMenu(event)}
										showLang={isParent || isChild}
										className={cardClassName || undefined}
										data-parent-label={t("event.parent", "Parent")}
										data-child-label={t("event.child", "Child")}
										onMouseEnter={() => setHoveredEventId(event.id)}
										onMouseLeave={() => setHoveredEventId(null)}
										views={
											event.slug && event.publishedAt ? (
												<>
													{" \u00b7 "}
													<ViewCount count={event.viewsCount} />
												</>
											) : null
										}
									/>
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
