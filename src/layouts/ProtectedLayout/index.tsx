"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { AiOutlineClose } from "@react-icons/all-files/ai/AiOutlineClose";
import { AiOutlineMenu } from "@react-icons/all-files/ai/AiOutlineMenu";
// removed unused AiOutlineMessage import
import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
import { useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import {
	Avatar,
	Breadcrumb,
	Button,
	Col,
	ConfigProvider,
	Drawer,
	Dropdown,
	Flex,
	FloatButton,
	Grid,
	Layout,
	Menu,
	type MenuProps,
	Row,
	Space,
	Typography,
} from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import axios from "axios";
import {
	ClientEvent,
	type MatrixClient,
	NotificationCountType,
	type Room,
	RoomEvent,
} from "matrix-js-sdk";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import { NextSeo, type NextSeoProps } from "next-seo";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import GdhubLogo from "@/assets/images/gdhub-beta-black-logo.svg";
import IconGDHubTriangle from "@/assets/images/gdhub-triangle.svg";
import { useChat } from "@/components/Chat/useChat";
import { ChatButton } from "@/components/ChatButton";
import { appThemeConfig } from "@/config/theme";
import { getDeviceDisplayName } from "@/helpers/device";
import { hasRole } from "@/helpers/user";
import { useTelegram } from "@/helpers/useTelegram";
import { useChatDrawerQuery } from "@/hooks/useChatDrawerQuery";
import { useFirebaseMessagingToken } from "@/hooks/useFirebaseMessagingToken";
import { useMatrixDeviceId } from "@/hooks/useMatrixDeviceId";
import { useMatrixPushRegistration } from "@/hooks/useMatrixPushRegistration";
import { createMatrixClient } from "@/lib/matrix-client";
import type { MatrixChatSessionResponse } from "@/types/chat";
import styles from "./style.module.scss";

const NotificationsBell = dynamic(
	() =>
		import("@/components/NotificationsBell").then((m) => m.NotificationsBell),
	{
		ssr: false,
	},
);
const AIAgentDrawer = dynamic(
	() => import("@/components/AIAgentDrawer").then((m) => m.AIAgentDrawer),
	{ ssr: false },
);
const ChatModal = dynamic(
	() => import("@/components/Chat/ChatModal").then((m) => m.ChatModal),
	{ ssr: false },
);

interface ProtectedLayoutProps {
	children: ReactNode;
	title?: string;
	subTitle?: string;
	seo?: NextSeoProps;
	backgroundImage?: string;
	showBackButton?: boolean;
	backButtonUrl?: string;
	projectName?: string;
	extra?: ReactNode;
	access?: prismaClient.UserRole[];
}

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export const ProtectedLayout = ({
	title,
	subTitle,
	seo,
	children,
	showBackButton = false,
	backButtonUrl,
	extra,
	access = [],
}: ProtectedLayoutProps) => {
	const router = useRouter();
	const { t, getLanguage, changeLanguage } = useTolgee();
	const [openMobileMenu, setOpenMobileMenu] = useState(false);
	const [isOpenedInTelegram] = useTelegram();
	const screens = Grid.useBreakpoint();
	const { data: session } = useSession();
	const matrixDeviceId = useMatrixDeviceId();
	const [openAgentDrawer, setOpenAgentDrawer] = useState(false);
	const [initialChatRoomId, setInitialChatRoomId] = useState<string | null>(
		null,
	);
	const clientRef = useRef<MatrixClient | null>(null);
	const {
		setOpenChatModal,
		openChatModal,
		chatClient,
		setChatClient,
		setReady,
		setUnreadTotal,
	} = useChat();

	useChatDrawerQuery({
		chatClient,
		setOpenChatModal,
		onResolveRoomId: setInitialChatRoomId,
	});

	// Start Matrix client in background for unread counters
	const { data: chatSessionData } = useQuery<MatrixChatSessionResponse>({
		queryKey: ["chat-client-session", session?.user.id],
		queryFn: () =>
			axios
				.post<MatrixChatSessionResponse>("/api/chat/session", {
					deviceId: matrixDeviceId,
				})
				.then((r) => r.data),
		enabled: !!session?.user.id && !!matrixDeviceId,
	});

	const { token: firebasePushToken } = useFirebaseMessagingToken();

	useMatrixPushRegistration({
		session: chatSessionData,
		pushKey: firebasePushToken,
		lang: session?.user.lang ?? getLanguage(),
		deviceDisplayName: getDeviceDisplayName(),
	});

	const tryComputeUnreadTotal = useCallback(
		(client: MatrixClient) => {
			try {
				const rooms = (client.getRooms() || []).filter((r: Room) =>
					["join", "invite"].includes(r.getMyMembership()),
				);
				const total = rooms.reduce((acc: number, r: Room) => {
					const count =
						r.getUnreadNotificationCount?.(NotificationCountType.Total) || 0;
					return acc + (Number.isFinite(count) ? count : 0);
				}, 0);
				setUnreadTotal(total);
			} catch {}
		},
		[setUnreadTotal],
	);

	useEffect(() => {
		if (!chatSessionData?.token) return;
		if (clientRef.current) return;

		let active = true;
		let createdClient: MatrixClient | null = null;

		const handleSync = (state: string) => {
			if (state === "PREPARED") {
				setReady(true);
				if (createdClient) {
					tryComputeUnreadTotal(createdClient);
				}
			}
		};

		createMatrixClient({
			accessToken: chatSessionData.token,
			userId: chatSessionData.userId,
			deviceId: chatSessionData.deviceId ?? undefined,
		})
			.then((client) => {
				if (!active) {
					client.stopClient();
					return;
				}

				clientRef.current = client;
				createdClient = client;
				client.startClient();
				client.once(ClientEvent.Sync, handleSync);
				setChatClient(client);
			})
			.catch(() => {});

		return () => {
			active = false;
			if (createdClient) {
				createdClient.removeListener(ClientEvent.Sync, handleSync);
				createdClient.stopClient();
			}
			clientRef.current = null;
			setChatClient(null);
			setReady(false);
		};
	}, [
		chatSessionData?.deviceId,
		chatSessionData?.token,
		setChatClient,
		chatSessionData?.userId,
		setReady,
		tryComputeUnreadTotal,
	]);

	useEffect(() => {
		if (!chatClient) return;

		const recompute = () => tryComputeUnreadTotal(chatClient);

		chatClient.on(RoomEvent.Receipt, recompute);
		chatClient.on(RoomEvent.Timeline, recompute);
		chatClient.on(RoomEvent.MyMembership, recompute);

		// also periodic safety net
		const interval = setInterval(recompute, 60_000);

		// initial
		recompute();

		return () => {
			chatClient.removeListener(RoomEvent.Receipt, recompute);
			chatClient.removeListener(RoomEvent.Timeline, recompute);
			chatClient.removeListener(RoomEvent.MyMembership, recompute);
			clearInterval(interval);
		};
	}, [chatClient, tryComputeUnreadTotal]);

	useEffect(() => {
		const handler = (e: CustomEvent<{ roomId: string }>) => {
			setInitialChatRoomId(e?.detail?.roomId || null);
			setOpenChatModal(true);
		};
		window.addEventListener("open-chat", handler as EventListener);
		return () =>
			window.removeEventListener("open-chat", handler as EventListener);
	}, [setOpenChatModal]);

	const hasAccess = useMemo(() => {
		if (!session) return false;
		if (!access || access.length === 0) return true;

		return access.some((role) => session.user.roles.includes(role));
	}, [session, access]);

	const isAdmin = useMemo(() => {
		if (!session) return false;

		console.log(session.user.roles);

		return hasRole(prismaClient.UserRole.Admin, { data: session });
	}, [session]);

	const seoSettings: NextSeoProps = useMemo(
		() => ({
			title,
			description: subTitle,
			canonical: process.env.NEXT_PUBLIC_APP_URL + router.asPath,
			nofollow: true,
			noindex: true,
			...seo,
		}),
		[title, subTitle, router.asPath, seo],
	);

	useEffect(() => {
		const unsetOverflow = () => {
			if (typeof window !== "undefined") {
				const body = document?.querySelector("body");
				body?.style.setProperty("overflow", "unset");
			}
		};

		unsetOverflow();
	}, []);

	useEffect(() => {
		if (session?.user.lang && getLanguage() !== session.user.lang) {
			changeLanguage(session.user.lang).then(() =>
				console.info("language is changed"),
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session?.user.lang]);

	useEffect(() => {
		if (!screens.lg) setOpenMobileMenu(false);
	}, [screens]);

	useEffect(() => {
		if (!hasAccess && session?.user && router.pathname !== "/hub") {
			router.push("/hub");
		}
	}, [hasAccess, router, router.pathname, session?.user]);

	const inlineMenuItems: MenuProps["items"] = useMemo(() => {
		const menu: MenuProps["items"] = [
			{
				style: { display: screens.lg ? "none" : "block" },
				label: (
					<Link href="/hub" title={t("Home")}>
						{screens.lg ? (
							<Button type="primary" size="small">
								{t("hub.menu.home", "Home")}
							</Button>
						) : (
							t("hub.menu.home", "Home")
						)}
					</Link>
				),
				key: "/hub",
			},

			{
				label: (
					<Link href="https://docs.gdhub.io" target="_blank">
						{screens.lg ? (
							<Button size="small">
								{t("hub.menu.documentation", "Documentation")}
							</Button>
						) : (
							<strong>{t("hub.menu.documentation", "Documentation")}</strong>
						)}
					</Link>
				),
				key: "/hub/docs",
			},
		];

		return menu;
	}, [screens, t]);

	const linkToChat = useMemo(() => {
		let link = "";

		switch (getLanguage()) {
			case "en":
				link = "https://t.me/gdhub_en";
				break;
			case "ru":
				link = "https://t.me/gdhub_io";
				break;
		}

		return link;
	}, [getLanguage]);

	const dropdownMenuItems: MenuProps["items"] = useMemo(() => {
		let menu: MenuProps["items"] = [];

		if (isAdmin) {
			menu.push({
				label: (
					<Link href="/admin/users">
						{t("hub.menu.administration", "Administration")}
					</Link>
				),
				key: "/admin/users",
			});
		}

		menu = [
			...menu,
			{
				label: <Link href="/profile">{t("hub.menu.profile", "Profile")}</Link>,
				key: "profile",
			},
			{
				label: (
					<Link href="/profile/settings/general">
						{t("hub.menu.settings", "Settings")}
					</Link>
				),
				key: "profile-settings",
			},
			{ type: "divider" },
			{
				key: "tg-community",
				label: (
					<Link href={linkToChat} target="_blank" title={t("Community Chat")}>
						<Space align="center" size={16}>
							<Text>{t("hub.menu.communityChat", "Community Chat")}</Text>
							<GoLinkExternal size={12} color="gray" />
						</Space>
					</Link>
				),
			},
			{
				key: "website",
				label: (
					<Link href="https://gdhub.io" target="_blank" title="Website">
						<Space align="center" size={16}>
							<Text>{t("hub.menu.website", "Website")}</Text>
							<GoLinkExternal size={12} color="gray" />
						</Space>
					</Link>
				),
			},
			{ type: "divider" },
			{
				style: { display: isOpenedInTelegram ? "none" : "block" },
				label: t("hub.menu.signOut", "Sign out"),
				key: "logout",
				danger: true,
				onClick: () => signOut({ redirect: true, callbackUrl: "/" }),
			},
		];

		return screens.lg
			? menu
			: [...inlineMenuItems, { key: "divider1", type: "divider" }, ...menu];
	}, [isAdmin, isOpenedInTelegram, screens, t, inlineMenuItems, linkToChat]);

	const menuItems: MenuProps["items"] = [
		{
			key: "/hub",
			label: <Link href="/hub">{t("hub.menu.overview", "Overview")}</Link>,
		},
		{
			key: "/hub/jobs",
			label: (
				<Link href="/hub/jobs">{t("hub.menu.jobs", "Open positions")}</Link>
			),
		},
		{
			key: "/hub/members",
			label: (
				<Link href="/hub/members">
					{t("hub.menu.talentPool", "Talent Pool")}
				</Link>
			),
		},
		{
			key: "/hub/projects",
			label: (
				<Link href="/hub/projects">{t("hub.menu.projects", "Projects")}</Link>
			),
		},
		{
			key: "/hub/events",
			label: <Link href="/hub/events">{t("hub.menu.events", "Events")}</Link>,
		},
		// {
		// 	key: '/hub/education',
		// 	label: <Link href="/hub/education">{t('hub.menu.education', 'Education')}</Link>,
		// },
		{
			key: "/hub/experts",
			label: (
				<Link href="/hub/experts">{t("hub.menu.experts", "Experts")}</Link>
			),
		},
		{
			key: "/profile/settings/general",
			label: (
				<Link href="/profile/settings/general">
					{t("hub.menu.settings", "Settings")}
				</Link>
			),
		},
	];

	return (
		<>
			<NextSeo {...seoSettings} />
			<style jsx global>{`
				:root {
					--background-color: #fafafa;
				}
			`}</style>
			<ConfigProvider
				theme={appThemeConfig}
				locale={getLanguage() === "en" ? enLocale : ruLocale}
			>
				<Layout className={styles.container}>
					<Header className={styles.header}>
						<Row wrap={false} align="middle" style={{ height: "64px" }}>
							<Col flex="auto">
								<Breadcrumb
									separator={<span style={{ color: "#00000033" }}>/</span>}
									items={[
										{
											title: (
												<Link href="/hub" className="logo">
													<GdhubLogo style={{ width: "100px" }} />
												</Link>
											),
										},

										{
											title: (
												<Space>
													<Avatar
														src={session?.user?.image ?? undefined}
														size={24}
													/>
													{screens.sm ? (
														<Text className="username">
															{session?.user?.name}
														</Text>
													) : null}
												</Space>
											),
										},
									]}
								/>
							</Col>
							<Col flex="none">
								<Space>
									{screens.xl ? (
										<>
											<Link href="https://docs.gdhub.io" target="_blank">
												<Button type="text" style={{ fontSize: 14 }}>
													{t("hub.menu.documentation", "Documentation")}
												</Button>
											</Link>
											<ChatButton onClick={() => setOpenChatModal(true)} />
											<NotificationsBell />
											<Dropdown
												menu={{ items: dropdownMenuItems }}
												trigger={["click"]}
											>
												<Button
													type="text"
													shape="circle"
													style={{
														display: "block",
														padding: 0,
														lineHeight: 0,
													}}
													icon={
														session?.user.image ? (
															<Avatar
																size={32}
																src={
																	session?.user?.image ? (
																		<Image
																			src={session?.user.image}
																			width={32}
																			height={32}
																			alt="avatar"
																		/>
																	) : null
																}
															/>
														) : null
													}
												/>
											</Dropdown>
										</>
									) : (
										<>
											<NotificationsBell />
											<ChatButton onClick={() => setOpenChatModal(true)} />
											<Button
												type="text"
												shape="circle"
												style={{ top: 2 }}
												onClick={() => setOpenMobileMenu(true)}
											>
												<AiOutlineMenu />
											</Button>
										</>
									)}
								</Space>
							</Col>
						</Row>
						<Menu
							items={menuItems}
							mode="horizontal"
							selectedKeys={[router.pathname]}
							className={styles.appMenu}
						/>
					</Header>
					<Content className={styles.contentContainer}>
						<div className={styles.content}>
							<Flex align="center" justify="space-between" gap={16} wrap={true}>
								<Space>
									{showBackButton &&
										(backButtonUrl ? (
											<Link href={backButtonUrl}>
												<Button
													type="text"
													icon={<ArrowLeftOutlined />}
													style={{ padding: 0 }}
												/>
											</Link>
										) : (
											<Button
												type="text"
												icon={<ArrowLeftOutlined />}
												onClick={() => router.back()}
												style={{ padding: 0 }}
											/>
										))}
									{!!title && <Title style={{ margin: 0 }}>{title}</Title>}
								</Space>

								{extra}
							</Flex>

							{!!subTitle && !showBackButton && <div>{subTitle}</div>}
							{!!subTitle && showBackButton && (
								<div style={{ marginLeft: 52 }}>{subTitle}</div>
							)}

							<div style={{ marginTop: 24 }}>{children}</div>
						</div>
					</Content>
					{/* <Footer></Footer> */}
				</Layout>
				{!screens.lg ? (
					<Drawer
						className={styles.mobileMenuDrawer}
						height={"100%"}
						title={
							<Space>
								<Avatar
									src={session?.user?.image ?? undefined}
									shape="square"
								/>
								<div className="username">{session?.user?.name}</div>
							</Space>
						}
						placement="top"
						onClose={() => setOpenMobileMenu(false)}
						open={openMobileMenu}
						extra={
							<Button
								shape="circle"
								style={{ top: 2 }}
								onClick={() => setOpenMobileMenu(false)}
								type="text"
							>
								<AiOutlineClose />
							</Button>
						}
					>
						<Menu
							items={dropdownMenuItems}
							onSelect={() => setOpenMobileMenu(false)}
						/>
					</Drawer>
				) : null}

				{/* agent drawer */}
				{isAdmin && (
					<>
						<FloatButton
							style={{ insetInlineEnd: 22, insetBlockEnd: 90 }}
							rootClassName={styles.agentDrawerFloatButton}
							tooltip={t("app.user.menu.aiAssistant", "Tri Assistant")}
							icon={<IconGDHubTriangle style={{ width: 60, height: 60 }} />}
							onClick={() => setOpenAgentDrawer(true)}
						/>

						<AIAgentDrawer
							open={openAgentDrawer}
							onClose={() => setOpenAgentDrawer(false)}
						/>
					</>
				)}

				{/* chat modal */}
				<ChatModal
					open={openChatModal}
					onClose={() => setOpenChatModal(false)}
					initialRoomId={initialChatRoomId}
				/>
			</ConfigProvider>
		</>
	);
};
