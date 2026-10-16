"use client";

import { IconExternalLink, IconX } from "@tabler/icons-react";
import { useTolgee } from "@tolgee/react";
import {
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
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { signOutWithChat } from "@/components/Chat/session";
import { Header as AppHeader } from "@/components/layouts/Header";
import { HeaderActions } from "@/components/layouts/HeaderActions";
import { useSpaceHeader } from "@/components/layouts/SpaceHeader";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { productTheme } from "@/config/design";
import { isAvailableLocale } from "@/config/locale";
import type { Permission } from "@/config/spaces";
import { useTelegram } from "@/helpers/useTelegram";
import { useUserSpaces } from "@/hooks/useUserSpaces";
import styles from "./style.module.scss";

const { Content } = Layout;
const { Text } = Typography;

/**
 * The single shell of the authenticated app, mounted once in
 * `app/(app)/layout.tsx`: AntD ConfigProvider, top header (logo, breadcrumbs,
 * navigation, actions) and mobile drawer.
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
	const spaceHeader = useSpaceHeader();
	const { can } = useAccess();
	const contentRef = useRef<HTMLElement>(null);
	const shellRef = useRef<HTMLElement>(null);

	// Drawn from a permission, not from a role: whoever may look at the user list
	// gets the link, including the narrower staff roles added later.
	const showAdministration = can("admin.users.view");

	// The scout link cannot come from a permission: the shell sits outside the
	// scout gate, so it holds no access snapshot for that space. Having a
	// cabinet is the same answer — it is what the space gate checks.
	const { data: userSpaces } = useUserSpaces();

	// The scroll container is the shell's own content, not the document, so route
	// changes no longer reset the scroll position by themselves.
	useEffect(() => {
		contentRef.current?.scrollTo({ top: 0 });
	}, [pathname]);

	// Publishes the header's real height as `--gd-app-header-height`. Pages need
	// it to size sticky panels against the visible part of the scroll area, and
	// the header grows or shrinks with the space menu, so it is measured rather
	// than hardcoded.
	useEffect(() => {
		const shell = shellRef.current;
		const header = shell?.querySelector("header");

		if (!shell || !header) return;

		const observer = new ResizeObserver(() => {
			shell.style.setProperty(
				"--gd-app-header-height",
				`${header.offsetHeight}px`,
			);
		});

		observer.observe(header);

		return () => observer.disconnect();
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

		if (showAdministration) {
			menu.push({
				label: (
					<Link href="/admin/users">
						{t("hub.menu.administration", "Administration")}
					</Link>
				),
				key: "/admin/users",
			});
		}

		if (userSpaces?.hasScoutCabinet) {
			menu.push({
				label: (
					<Link href="/scout/games">
						{t("hub.menu.scoutCabinet", "Scout cabinet")}
					</Link>
				),
				key: "/scout/games",
			});
		}

		if (userSpaces?.hasAdvisorSpace) {
			menu.push({
				label: (
					<Link href="/advisor/requests">
						{t("hub.menu.advisorSpace", "Advisor space")}
					</Link>
				),
				key: "/advisor/requests",
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
							<IconExternalLink size={12} color="gray" />
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
							<IconExternalLink size={12} color="gray" />
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
				onClick: () => signOutWithChat({ redirect: true, callbackUrl: "/" }),
			},
		];

		return screens.lg
			? menu
			: [...inlineMenuItems, { key: "divider1", type: "divider" }, ...menu];
	}, [
		showAdministration,
		userSpaces?.hasScoutCabinet,
		isOpenedInTelegram,
		screens,
		t,
		inlineMenuItems,
		linkToChat,
	]);

	/**
	 * A tab is drawn only for someone allowed to open what is behind it.
	 *
	 * The permission is the same one the page itself checks, so the nav and the
	 * page can no longer disagree — a link that leads to a refusal is worse than
	 * no link. Overview and Settings carry no gate: the space root and the user's
	 * own settings belong to whoever is signed in.
	 */
	const menuItems: MenuProps["items"] = (
		[
			{
				key: "/hub",
				label: <Link href="/hub">{t("hub.menu.overview", "Overview")}</Link>,
			},
			{
				key: "/hub/jobs",
				permission: "hub.jobs.view",
				label: (
					<Link href="/hub/jobs">{t("hub.menu.jobs", "Open positions")}</Link>
				),
			},
			{
				key: "/hub/members",
				permission: "hub.talent_pool.view",
				label: (
					<Link href="/hub/members">
						{t("hub.menu.talentPool", "Talent Pool")}
					</Link>
				),
			},
			{
				key: "/hub/projects",
				permission: "hub.projects.view",
				label: (
					<Link href="/hub/projects">{t("hub.menu.projects", "Projects")}</Link>
				),
			},
			{
				key: "/hub/events",
				permission: "hub.events.view",
				label: <Link href="/hub/events">{t("hub.menu.events", "Events")}</Link>,
			},
			{
				key: "/hub/experts",
				permission: "hub.experts.view",
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
		] satisfies (NonNullable<MenuProps["items"]>[number] & {
			permission?: Permission;
		})[]
	)
		.filter((item) => !item.permission || can(item.permission))
		.map(({ permission: _permission, ...item }) => item);

	return (
		<>
			<style jsx global>{`
				:root {
					--background-color: var(--gd-color-bg);
				}
				/* Scoped to the authenticated app by this component's lifetime:
				   public pages and the landing keep the normal document scroll. */
				html,
				body {
					overflow: hidden;
					overscroll-behavior: none;
				}
			`}</style>
			<ConfigProvider
				theme={productTheme}
				locale={getLanguage() === "en" ? enLocale : ruLocale}
			>
				<Layout ref={shellRef} className={styles.container}>
					<AppHeader
						className={styles.header}
						trail={spaceHeader?.trail}
						fallback={
							/* No space: this names who is signed in, not where you are —
							   so no switcher, no separator and no hover chip. */
							<Space className={styles.identity}>
								<AppAvatar src={session?.user?.image ?? undefined} size={24} />
								{screens.sm ? (
									<Text className="username">{session?.user?.name}</Text>
								) : null}
							</Space>
						}
						actions={
							<HeaderActions
								dropdownMenuItems={dropdownMenuItems}
								onOpenMobileMenu={() => setOpenMobileMenu(true)}
								avatarSeed={session?.user.email ?? undefined}
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
					<Content ref={contentRef} className={styles.contentContainer}>
						<div className="layout-background">{children}</div>
					</Content>
				</Layout>
				{!screens.lg ? (
					<Drawer
						className={styles.mobileMenuDrawer}
						title={
							<Space>
								<AppAvatar
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
								<IconX />
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
				{/* {showAdministration && (
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
			</ConfigProvider>
		</>
	);
}
