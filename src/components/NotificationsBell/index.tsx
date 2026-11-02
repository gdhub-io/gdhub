"use client";

import { Inbox } from "@novu/react";
import { IconInbox } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import { theme } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect } from "react";
import { UnreadDot } from "@/components/ui";
import { useFirebaseMessagingToken } from "@/hooks/useFirebaseMessagingToken";
import styles from "./style.module.scss";

// Novu sizes a notification's lines as this share of `variables.fontSize`.
const NOVU_TEXT_RATIO = 0.765625;

export const NotificationsBell = () => {
	const { getLanguage, t } = useTolgee();
	const router = useRouter();
	const { data: session } = useSession();
	const { token } = theme.useToken();

	const {
		token: fcmToken,
		isSupported: isFcmSupported,
		permissionState,
		ready: isFcmReady,
	} = useFirebaseMessagingToken();

	const { data: signature } = useQuery({
		queryKey: ["novu-signature", session?.user.id],
		queryFn: () =>
			axios.get<{ signature: string }>("/api/services/novu/signature"),
		enabled: !!session?.user.id,
		refetchOnWindowFocus: false,
	});

	const { mutate: registerFcmToken } = useMutation({
		mutationKey: ["novu-fcm-token", session?.user.id],
		mutationFn: (token: string) =>
			axios.post("/api/services/novu/fcm-token", {
				token,
			}),
	});

	useEffect(() => {
		if (!session?.user.id) return;
		if (!isFcmReady) return;
		if (!isFcmSupported) return;
		if (permissionState !== "granted") return;
		if (!fcmToken) return;

		registerFcmToken(fcmToken);
	}, [
		fcmToken,
		isFcmReady,
		isFcmSupported,
		permissionState,
		registerFcmToken,
		session?.user?.id,
	]);

	if (!session || !signature?.data.signature) {
		return null;
	}

	return (
		<div className={styles.component}>
			<Suspense fallback={null}>
				<Inbox
					// onPrimaryActionClick={(notification) => router.push(notification.prim)}
					localization={{
						"inbox.filters.labels.archived": t(
							"novu.inbox.filters.labels.archived",
							"Archived",
						),
						"inbox.filters.labels.unread": t(
							"novu.inbox.filters.labels.unread",
							"Unread",
						),
						"inbox.filters.dropdownOptions.default": t(
							"novu.inbox.filters.dropdownOptions.default",
							"All",
						),
						"inbox.filters.dropdownOptions.archived": t(
							"novu.inbox.filters.dropdownOptions.archived",
							"Archived",
						),
						"inbox.filters.dropdownOptions.unread": t(
							"novu.inbox.filters.dropdownOptions.unread",
							"Unread",
						),
						"notifications.emptyNotice": t(
							"novu.notifications.emptyNotice",
							"No notifications",
						),
						"inbox.filters.labels.default": t(
							"novu.inbox.filters.labels.default",
							"All",
						),
						"notification.actions.archive.tooltip": t(
							"novu.notification.actions.archive.tooltip",
							"Archive",
						),
						"notification.actions.read.tooltip": t(
							"novu.notification.actions.read.tooltip",
							"Mark as read",
						),
						"notification.actions.unarchive.tooltip": t(
							"novu.notification.actions.unarchive.tooltip",
							"Unarchive",
						),
						"notification.actions.unread.tooltip": t(
							"novu.notification.actions.unread.tooltip",
							"Mark as unread",
						),
						"notifications.actions.archiveAll": t(
							"novu.notifications.actions.archiveAll",
							"Archive all",
						),
						"notifications.actions.archiveRead": t(
							"novu.notifications.actions.archiveRead",
							"Archive read",
						),
						"notifications.actions.readAll": t(
							"novu.notifications.actions.readAll",
							"Mark all as read",
						),
						"notifications.newNotifications": t(
							"novu.notifications.newNotifications",
							"New notifications",
						),
						"preferences.global": t("novu.preferences.global", "General"),
						"preferences.title": t("novu.preferences.title", "Settings"),
						"preferences.workflow.disabled.notice": t(
							"novu.preferences.workflow.disabled.notice",
							"This workflow is disabled",
						),
						"preferences.workflow.disabled.tooltip": t(
							"novu.preferences.workflow.disabled.tooltip",
							"This workflow is disabled",
						),
						dynamic: {
							// use the workflowId as a key to localize the workflow name
							"comment-on-post": t(
								"novu.dynamic.comment-on-post",
								"Post comments",
							),
						},
						locale: getLanguage() == "ru" ? "ru-RU" : "en-US",
					}}
					applicationIdentifier={
						process.env.NEXT_PUBLIC_NOVU_CLIENT_APP_ID as string
					}
					subscriberId={session?.user.id}
					subscriberHash={signature?.data.signature}
					routerPush={(path: string) => router.push(path)}
					renderBell={(unreadCount) => {
						const unread = unreadCount?.total ?? 0;
						return (
							<UnreadDot unread={unread > 0}>
								<IconInbox
									className={styles.bellIcon}
									stroke={1.75}
									role="img"
									aria-label={
										unread
											? t(
													"notifications.bell.unread",
													"Notifications, {count} unread",
													{ count: unread },
												)
											: t("notifications.bell.title", "Notifications")
									}
								/>
							</UnreadDot>
						);
					}}
					appearance={{
						variables: {
							colorPrimary: token.colorPrimaryText,
							colorForeground: token.colorText,
							colorBackground: token.colorBgElevated,
							fontSize: `${token.fontSize / NOVU_TEXT_RATIO}px`,
							borderRadius: `${token.borderRadius}px`,
						},
						elements: {
							inboxContent: {
								fontFamily: token.fontFamily,
							},
							bellIcon: styles.bellIcon,
							popoverTrigger: styles.popoverTrigger,
							notificationDate: styles.notificationDate,
							popoverContent: styles.popoverContent,
						},
					}}
				/>
			</Suspense>
		</div>
	);
};
