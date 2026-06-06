"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { AiOutlineClose } from "@react-icons/all-files/ai/AiOutlineClose";
import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
import { useTolgee } from "@tolgee/react";
import {
	Avatar,
	type BreadcrumbProps,
	Button,
	ConfigProvider,
	Drawer,
	Flex,
	FloatButton,
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
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { NextSeo, type NextSeoProps } from "next-seo";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import IconGDHubTriangle from "@/assets/images/gdhub-triangle.svg";
import { ChatProvider } from "@/components/Chat/ChatProvider";
import { useChat } from "@/components/Chat/useChat";
import { Header as AppHeader } from "@/components/layouts/Header";
import { HeaderActions } from "@/components/layouts/HeaderActions";
import { isAvailableLocale } from "@/config/locale";
import { appThemeConfig } from "@/config/theme";
import { hasRole } from "@/helpers/user";
import { useTelegram } from "@/helpers/useTelegram";
import styles from "./style.module.scss";

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
	topMenuItems?: MenuProps["items"];
	topMenuSelectedKeys?: string[];
	/** Additional breadcrumb items appended after the logo, replacing the default user info crumb when provided. */
	breadcrumbs?: BreadcrumbProps["items"];
	/** Removes default content top padding and child top margin so pages can sit flush under the header. */
	flushBodyTop?: boolean;
	/** Removes horizontal content padding below `md` for full-width single-column layouts. */
	contentBleedBelowMd?: boolean;
}

const { Content } = Layout;
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
	topMenuItems,
	topMenuSelectedKeys,
	breadcrumbs,
	flushBodyTop = false,
	contentBleedBelowMd = false,
}: ProtectedLayoutProps) => {
	const router = useRouter();
	const pathname = usePathname() ?? "";
	const { t, getLanguage, changeLanguage } = useTolgee();
	const [openMobileMenu, setOpenMobileMenu] = useState(false);
	const [isOpenedInTelegram] = useTelegram();
	const screens = Grid.useBreakpoint();
	const { data: session } = useSession();
	const [openAgentDrawer, setOpenAgentDrawer] = useState(false);
	const { setOpenChatModal } = useChat();

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
			canonical: process.env.NEXT_PUBLIC_APP_URL + pathname,
			nofollow: true,
			noindex: true,
			...seo,
		}),
		[title, subTitle, pathname, seo],
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

	useEffect(() => {
		if (!hasAccess && session?.user && pathname !== "/hub") {
			router.push("/hub");
		}
	}, [hasAccess, router, pathname, session?.user]);

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

	const resolvedTopMenuItems = topMenuItems || menuItems;
	const resolvedTopMenuSelectedKeys = topMenuSelectedKeys || [pathname];

	return (
		<ChatProvider>
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
					<AppHeader
						className={styles.header}
						breadcrumbItems={
							breadcrumbs?.length
								? breadcrumbs
								: [
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
									]
						}
						actions={
							<HeaderActions
								dropdownMenuItems={dropdownMenuItems}
								onOpenMobileMenu={() => setOpenMobileMenu(true)}
								onOpenChat={() => setOpenChatModal(true)}
							/>
						}
						menu={
							<Menu
								items={resolvedTopMenuItems}
								mode="horizontal"
								selectedKeys={resolvedTopMenuSelectedKeys}
								className={styles.appMenu}
							/>
						}
					/>
					<Content className={styles.contentContainer}>
						<div
							className={`${styles.content} ${flushBodyTop ? styles.contentFlushTop : ""} ${contentBleedBelowMd ? styles.contentBleedBelowMd : ""}`}
						>
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

							<div
								className={
									flushBodyTop ? styles.pageBodyFlush : styles.pageBodySpaced
								}
							>
								{children}
							</div>
						</div>
					</Content>
					{/* <Footer></Footer> */}
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
				<ChatModal />
			</ConfigProvider>
		</ChatProvider>
	);
};
