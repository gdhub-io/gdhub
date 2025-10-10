import { ArrowLeftOutlined } from "@ant-design/icons";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { AiOutlineClose } from "@react-icons/all-files/ai/AiOutlineClose";
import { AiOutlineMenu } from "@react-icons/all-files/ai/AiOutlineMenu";
import { AiOutlineMessage } from "@react-icons/all-files/ai/AiOutlineMessage";
import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
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
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { NextSeo, type NextSeoProps } from "next-seo";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import GdhubLogo from "@/assets/images/gdhub-beta-black-logo.svg";
import IconGDHubTriangle from "@/assets/images/gdhub-triangle.svg";
import { AIAgentDrawer } from "@/components/AIAgentDrawer";
import { ChatModal } from "@/components/Chat/ChatModal";
import { useChat } from "@/components/Chat/useChat";
import { NotificationsBell } from "@/components/NotificationsBell";
import { appThemeConfig } from "@/config/theme";
import { hasRole } from "@/helpers/user";
import { useTelegram } from "@/helpers/useTelegram";
import styles from "./style.module.scss";

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
	const [openAgentDrawer, setOpenAgentDrawer] = useState(false);
	const [initialChatRoomId, setInitialChatRoomId] = useState<string | null>(null);
	const { setOpenChatModal, openChatModal } = useChat();

	useEffect(() => {
		const handler = (e: any) => {
			setInitialChatRoomId(e?.detail?.roomId || null);
			setOpenChatModal(true);
		};
		window.addEventListener("open-chat", handler);
		return () => window.removeEventListener("open-chat", handler);
	}, []);

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

	const seoSettings: NextSeoProps = {
		title,
		description: subTitle,
		canonical: process.env.NEXT_PUBLIC_APP_URL + router.asPath,
		nofollow: true,
		noindex: true,
		...seo,
	};

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
		if (session?.user.lang)
			changeLanguage(session.user.lang).then((d) => console.log("language is changed"));
	}, [session?.user.lang]);

	useEffect(() => {
		if (!screens.lg) setOpenMobileMenu(false);
	}, [session, screens]);

	useEffect(() => {
		if (!hasAccess && session?.user && router.pathname !== "/hub") {
			router.push("/hub");
		}
	}, [hasAccess, router.pathname, session?.user]);

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
							<Button size="small">{t("hub.menu.documentation", "Documentation")}</Button>
						) : (
							<strong>{t("hub.menu.documentation", "Documentation")}</strong>
						)}
					</Link>
				),
				key: "/hub/docs",
			},
		];

		return menu;
	}, [screens, session]);

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
	}, [router]);

	const dropdownMenuItems: MenuProps["items"] = useMemo(() => {
		let menu: MenuProps["items"] = [];

		if (isAdmin) {
			menu.push({
				label: <Link href="/admin/posts">{t("hub.menu.administration", "Administration")}</Link>,
				key: "/admin/posts",
			});
		}

		menu = [
			...menu,
			{
				label: <Link href="/profile">{t("hub.menu.userSettings", "User Settings")}</Link>,
				key: "profile",
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

		return screens.lg ? menu : [...inlineMenuItems, { key: "divider1", type: "divider" }, ...menu];
	}, [isOpenedInTelegram, screens, session]);

	const menuItems: MenuProps["items"] = [
		{
			key: "/hub",
			label: <Link href="/hub">{t("hub.menu.overview", "Overview")}</Link>,
		},
		{
			key: "/hub/vacancies",
			label: <Link href="/hub/vacancies">{t("hub.menu.vacancies", "Vacancies")}</Link>,
		},
		{
			key: "/hub/members",
			label: <Link href="/hub/members">{t("hub.menu.members", "Members")}</Link>,
		},
		{
			key: "/hub/projects",
			label: <Link href="/hub/projects">{t("hub.menu.projects", "Projects")}</Link>,
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
			label: <Link href="/hub/experts">{t("hub.menu.experts", "Experts")}</Link>,
		},
		{
			key: "/profile/settings/general",
			label: <Link href="/profile">{t("hub.menu.settings", "Settings")}</Link>,
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
			<ConfigProvider theme={appThemeConfig} locale={getLanguage() == "en" ? enLocale : ruLocale}>
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
													<Avatar src={session?.user?.image ?? undefined} size={24} />
													{screens.sm ? (
														<Text className="username">{session?.user?.name}</Text>
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
											<Button
												type="text"
												shape="circle"
												onClick={() => setOpenChatModal(true)}
												icon={<AiOutlineMessage />}
											/>
											<NotificationsBell />
											<Dropdown menu={{ items: dropdownMenuItems }} trigger={["click"]}>
												<Button
													type="text"
													shape="circle"
													style={{ display: "block", padding: 0, lineHeight: 0 }}
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
											<Button
												type="text"
												shape="circle"
												style={{ top: 2 }}
												onClick={() => setOpenChatModal(true)}
												icon={<AiOutlineMessage />}
											/>
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
							<Flex
								align="center"
								justify="space-between"
								gap={16}
								style={{ marginBottom: 24 }}
								wrap={true}
							>
								<Space>
									{showBackButton && (
										<>
											{backButtonUrl ? (
												<Link href={backButtonUrl}>
													<Button type="text" icon={<ArrowLeftOutlined />} style={{ padding: 0 }} />
												</Link>
											) : (
												<Button
													type="text"
													icon={<ArrowLeftOutlined />}
													onClick={() => router.back()}
													style={{ padding: 0 }}
												/>
											)}
										</>
									)}
									{!!title && <Title style={{ margin: 0 }}>{title}</Title>}
								</Space>

								{extra}
							</Flex>

							{!!subTitle && !showBackButton && <div>{subTitle}</div>}
							{!!subTitle && showBackButton && <div style={{ marginLeft: 52 }}>{subTitle}</div>}

							{children}
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
								<Avatar src={session?.user?.image ?? undefined} shape="square" />
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
						<Menu items={dropdownMenuItems} onSelect={() => setOpenMobileMenu(false)} />
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

						<AIAgentDrawer open={openAgentDrawer} onClose={() => setOpenAgentDrawer(false)} />
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
