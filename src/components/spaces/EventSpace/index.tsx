"use client";

import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Grid, message, Space, Typography } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import axios from "axios";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { CSSProperties } from "react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { Error404 } from "@/components/Error404";
import {
	type SpaceHeaderConfig,
	useSetSpaceHeader,
} from "@/components/layouts/SpaceHeader";
import { EventStatus } from "@/config/prisma-enums";
import { type ContextEvent, EventContext } from "@/contexts/EventContext";
import { useCurrentEvent } from "@/hooks/event";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

/**
 * Event space chrome: publishes the event breadcrumbs and tabs (including the
 * publish / unpublish actions) into the global app header, exposes EventContext
 * to the pages below and renders the per-page hero.
 *
 * Header, chat and theme come from the surrounding ProtectedShell in
 * `app/(app)/layout.tsx` — this component owns no shell of its own.
 */
export const EventSpace = ({
	title,
	description,
	children,
	actions,
	customStyles,
}: {
	title?: string;
	description?: string;
	children: ReactNode;
	actions?: ReactNode;
	customStyles?: {
		contentContainer?: CSSProperties;
		content?: CSSProperties;
	};
}) => {
	const { t } = useTranslate();
	const params = useParams<{ eventId?: string }>();
	const pathname = usePathname() ?? "";
	const queryClient = useQueryClient();
	const eventId = params?.eventId as string;
	const [messageApi, messageContextHolder] = message.useMessage();
	const [contextEvent, setContextEvent] = useState<ContextEvent>();
	const screens = Grid.useBreakpoint();
	const { data: session } = useSession();
	const { can } = useAccess();

	const { event, isFetched } = useCurrentEvent();
	const isEventAuthor = useMemo(
		() => event?.createdById === session?.user.id,
		[event, session?.user],
	);

	useEffect(() => {
		if (!event) return;

		setContextEvent({
			id: event.id,
			title: event.title,
			isEventAuthor,
		});
	}, [event, isEventAuthor]);

	useDocumentTitle(
		title ? `${title} · ${event?.title ?? "Event"}` : event?.title,
	);

	const { mutateAsync: publishEvent, isPending: isPublishingEvent } =
		useMutation({
			mutationFn: (id: string) => axios.put(`/api/user/event/${id}/publish`),
			onSuccess: () => {
				messageApi.success(t("event.publish.success", "Event published"));
				queryClient.invalidateQueries({ queryKey: ["event", eventId] });
			},
			onError: () => {
				message.error(t("event.publish.error", "Error publishing event"));
			},
		});

	const { mutateAsync: unpublishEvent, isPending: isUnpublishingEvent } =
		useMutation({
			mutationFn: (id: string) => axios.put(`/api/user/event/${id}/unpublish`),
			onSuccess: () => {
				messageApi.success(t("event.unpublish.success", "Event unpublished"));
				queryClient.invalidateQueries({ queryKey: ["event", eventId] });
			},
			onError: () => {
				message.error(t("event.unpublish.error", "Error unpublishing event"));
			},
		});

	const spaceHeader: SpaceHeaderConfig = useMemo(() => {
		const menuItems: (ItemType & { disabled?: boolean })[] = [
			{
				key: `/user/event/${eventId}/schedule`,
				label: (
					<Link href={`/user/event/${eventId}/schedule`}>
						{t("app.user-event.menu.schedule", "Schedule")}
					</Link>
				),
			},
			{
				key: `/user/event/${eventId}/content`,
				label: (
					<Link href={`/user/event/${eventId}/content`}>
						{t("app.user-event.menu.content", "Content")}
					</Link>
				),
			},
			{
				key: `/user/event/${eventId}/members`,
				label: (
					<Link href={`/user/event/${eventId}/members`}>
						{t("app.user-event.menu.members", "Members")}
					</Link>
				),
			},
			{
				key: `/user/event/${eventId}/settings/general`,
				disabled: !can("event.info.edit"),
				label: (
					<Link href={`/user/event/${eventId}/settings/general`}>
						{t("app.user.menu.settings", "Settings")}
					</Link>
				),
			},
			{
				key: `/event/${event?.slug}`,
				className: styles.publicPageMenuItem,
				label: (
					<Space wrap={true}>
						{event?.status === EventStatus.Draft &&
							can("event.lifecycle.publish") && (
								<Space wrap={true}>
									<Text type="secondary">The event is not published yet</Text>
									<Button
										type="primary"
										size="small"
										onClick={() => publishEvent(eventId)}
										loading={isPublishingEvent}
									>
										{t("event.button.publish", "Publish")}
									</Button>
								</Space>
							)}

						<Button
							type="text"
							size="small"
							href={`${event?.lang ? `/${event?.lang}` : ""}/event/${event?.slug}`}
							target="_blank"
						>
							{t("event.button.publicPage", "Go to page")}
							<GoLinkExternal size={12} color="gray" />
						</Button>

						{event?.status === EventStatus.Published &&
							can("event.lifecycle.publish") && (
								<Button
									type="default"
									size="small"
									onClick={() => unpublishEvent(eventId)}
									loading={isUnpublishingEvent}
								>
									{t("event.button.unpublish", "Unpublish")}
								</Button>
							)}
					</Space>
				),
			},
		];

		return {
			breadcrumbItems: [
				{
					title: screens.md ? (
						<Link href="/user/events">
							{t("hub.menu.my-events", "My events")}
						</Link>
					) : null,
				},
				{
					title: (
						<div style={{ display: "grid" }}>
							<Text ellipsis={{ tooltip: true }}>
								{event?.title || "Event"}
							</Text>
						</div>
					),
				},
			],
			menuItems: menuItems.filter((item) => !item.disabled),
			menuSelectedKeys: [pathname],
		};
	}, [
		can,
		eventId,
		event?.slug,
		event?.status,
		event?.title,
		event?.lang,
		isEventAuthor,
		isPublishingEvent,
		isUnpublishingEvent,
		pathname,
		publishEvent,
		unpublishEvent,
		screens.md,
		t,
	]);

	useSetSpaceHeader(spaceHeader);

	if (isFetched && !event) {
		return (
			<Error404
				callbackUrl={"/hub"}
				textBackButton="Back to Hub"
				theme="light"
				containerStyle={{ height: "50vh" }}
			/>
		);
	}

	return (
		<EventContext.Provider
			value={{ contextEvent, isLoaded: isFetched, setContextEvent }}
		>
			{messageContextHolder}
			<div style={customStyles?.contentContainer}>
				<div style={customStyles?.content}>
					<Flex
						justify="space-between"
						align="center"
						style={{ marginBottom: 24 }}
						wrap={true}
					>
						<Space orientation="vertical" size={0}>
							{!!title && <Title style={{ margin: 0 }}>{title}</Title>}
							{!!description && <Text type="secondary">{description}</Text>}
						</Space>
						{actions}
					</Flex>

					{children}
				</div>
			</div>
		</EventContext.Provider>
	);
};
