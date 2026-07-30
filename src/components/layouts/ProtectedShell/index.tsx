"use client";

import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { AiOutlineClose } from "@react-icons/all-files/ai/AiOutlineClose";
import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
import { useTolgee } from "@tolgee/react";
import {
	Avatar,
	Button,
	ConfigProvider,
	Drawer,
	Grid,
	Layout,
	Menu,
	type MenuProps,
	Space,
	Typography,
} from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { genConfig } from "react-nice-avatar";
import { useChat } from "@/components/Chat/useChat";
import { Header as AppHeader } from "@/components/layouts/Header";
import { HeaderActions } from "@/components/layouts/HeaderActions";
import { useSpaceHeader } from "@/components/layouts/SpaceHeader";
import { isAvailableLocale } from "@/config/locale";
import { appThemeConfig } from "@/config/theme";
import { hasRole } from "@/helpers/user";
import { useTelegram } from "@/helpers/useTelegram";
import styles from "./style.module.scss";

const ChatModal = dynamic(
	() => import("@/components/Chat/ChatModal").then((m) => m.ChatModal),
	{ ssr: false },
);

const { Content } = Layout;
const { Text } = Typography;

/**
 * The single shell of the authenticated app, mounted once in
 * `app/(app)/layout.tsx`: AntD ConfigProvider, top header (logo, breadcrumbs,
 * navigation, actions), mobile drawer and ChatModal.
 *
 * Breadcrumbs and top navigation default to the hub ones, and are replaced by
 * whatever the current space publishes through `useSetSpaceHeader` (project,
 * event, admin). Per-page heroes are not rendered here — pages put
 * <ProtectedPageHeader> into their own content.
 */
export function ProtectedShell({ children }: { children: ReactNode }) {
	const pathname = usePathname() ?? "";
	const { t, getLanguage, changeLanguage } = useTolgee();
	const [openMobileMenu, setOpenMobileMenu] = useState(false);
	const [isOpenedInTelegram] = useTelegram();
	const screens = Grid.useBreakpoint();
	const { data: session } = useSession();
	const { setOpenChatModal } = useChat();
	const spaceHeader = useSpaceHeader();

	const isAdmin = useMemo(() => {
		if (!session) return false;
		return hasRole(prismaClient.UserRole.Admin, { data: session });
	}, [session]);

	/** Fallback avatar for users without an uploaded image. */
	const avatarConfig = useMemo(() => {
		if (!session?.user.email) return;

		const config = genConfig(session.user.email);
		config.hairStyle = "normal";

		return config;
	}, [session?.user.email]);

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
		if (
			isAvailableLocale(session?.user.lang) &&
			getLanguage() !== session.user.lang
		) {
			changeLanguage(session.user.lang).then(() =>
				console.info("language is changed"),
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session?.user.lang]);

	useEffect(() => {
		if (!screens.lg) setOpenMobileMenu(false);
	}, [screens]);

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
					<Link href="/user/settings/general">
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
		{
			key: "/hub/experts",
			label: (
				<Link href="/hub/experts">{t("hub.menu.experts", "Experts")}</Link>
			),
		},
		{
			key: "/user/settings/general",
			label: (
				<Link href="/user/settings/general">
					{t("hub.menu.settings", "Settings")}
				</Link>
			),
		},
	];

	return (
		<>
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
					<AppHeader
						className={styles.header}
						breadcrumbItems={
							spaceHeader?.breadcrumbItems ?? [
								{
									title: (
										<Space>
											<Avatar
												src={session?.user?.image ?? undefined}
												size={24}
											/>
											{screens.sm ? (
												<Text className="username">{session?.user?.name}</Text>
											) : null}
										</Space>
									),
								},
							]
						}
						actions={
							<HeaderActions
								dropdownMenuItems={dropdownMenuItems}
								onOpenMobileMenu={() => setOpenMobileMenu(true)}
								onOpenChat={() => setOpenChatModal(true)}
								avatarConfig={avatarConfig}
							/>
						}
						menu={
							<Menu
								items={spaceHeader?.menuItems ?? menuItems}
								mode="horizontal"
								selectedKeys={spaceHeader?.menuSelectedKeys ?? [pathname]}
								className={styles.appMenu}
							/>
						}
					/>
					<Content className={styles.contentContainer}>
						<div className="layout-background">{children}</div>
					</Content>
				</Layout>
				{!screens.lg ? (
					<Drawer
						className={styles.mobileMenuDrawer}
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
				{/* {isAdmin && (
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
				)} */}

				{/* chat modal */}
				<ChatModal />
			</ConfigProvider>
		</>
	);
}
