import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { AiOutlineClose } from "@react-icons/all-files/ai/AiOutlineClose";
import { AiOutlineMenu } from "@react-icons/all-files/ai/AiOutlineMenu";
import { GoArrowUp } from "@react-icons/all-files/go/GoArrowUp";
import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
import { useTolgee, useTranslate } from "@tolgee/react";
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
import type { ItemType } from "antd/es/menu/interface";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import { NextSeo, type NextSeoProps } from "next-seo";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import ReactNiceAvatar, { genConfig } from "react-nice-avatar";
import GdhubLogo from "@/assets/images/gdhub-beta-black-logo.svg";
import { Error404 } from "@/components/Error404";
import { NotificationsBell } from "@/components/NotificationsBell";
import { appThemeConfig } from "@/config/theme";
import { type ContextEvent, EventContext } from "@/contexts/EventContext";
import { hasRole } from "@/helpers/user";
import { useTelegram } from "@/helpers/useTelegram";
import { useCurrentEvent } from "@/hooks/event";
import { ProtectedLayout } from "../ProtectedLayout";
import styles from "./style.module.scss";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export const ProtectedEventLayout = ({
	title,
	description,
	seo,
	children,
	actions,
}: {
	title?: string;
	description?: string;
	seo?: NextSeoProps;
	children: ReactNode;
	actions?: ReactNode;
}) => {
	const { t } = useTranslate();
	const router = useRouter();
	const eventId = router.query.eventId as string;
	const [contextEvent, setContextEvent] = useState<ContextEvent>();
	const [openMobileMenu, setOpenMobileMenu] = useState(false);
	const [isOpenedInTelegram] = useTelegram();
	const screens = Grid.useBreakpoint();
	const { data: session }: any = useSession();
	const { changeLanguage, getLanguage } = useTolgee();

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

	const seoSettings: NextSeoProps = {
		title: title || "Project",
		canonical: process.env.NEXT_PUBLIC_APP_URL + router.asPath,
		nofollow: true,
		noindex: true,
		description,
		...seo,
	};

	useEffect(() => {
		if (session?.user.lang)
			changeLanguage(session.user.lang).then((d) =>
				console.log("language is changed"),
			);
	}, [session?.user.lang]);

	useEffect(() => {
		if (!screens.lg) setOpenMobileMenu(false);
	}, [session, screens]);

	const avatarConfig = useMemo(() => {
		if (!session?.user.email) return;

		const config = genConfig(session.user.email);
		config.hairStyle = "normal";

		return config;
	}, [session?.user.email]);

	const inlineMenuItems: MenuProps["items"] = useMemo(() => {
		const menu: MenuProps["items"] = [
			{
				style: { display: screens.lg ? "none" : "block" },
				label: (
					<Link href="/hub" title="Dashboard">
						{screens.lg ? (
							<Button type="primary" size="small">
								Dashboard
							</Button>
						) : (
							t("Dashboard")
						)}
					</Link>
				),
				key: "/hub",
			},

			{
				label: (
					<Link href="https://docs.gdhub.io" target="_blank">
						{screens.lg ? (
							<Button size="small">Documentation</Button>
						) : (
							<strong>Documentation</strong>
						)}
					</Link>
				),
				key: "/hub/docs",
			},
		];

		return menu;
	}, [screens, session]);

	const dropdownMenuItems: MenuProps["items"] = useMemo(() => {
		let menu: MenuProps["items"] = [];

		if (hasRole(prismaClient.UserRole.Admin, { data: session })) {
			menu.push({
				label: <Link href="/admin/seasons">Админка</Link>,
				key: "/admin/seasons",
			});
		}

		menu = [
			...menu,
			{
				label: <Link href="/profile">User Settings</Link>,
				key: "profile",
			},
			{ type: "divider" },
			{
				key: "tg-community",
				label: (
					<Link
						href="https://t.me/gdhub_io"
						target="_blank"
						title="Telegram community chat"
					>
						<Space align="center" size={16}>
							<Text>Community chat</Text>
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
							<Text>Website</Text>
							<GoLinkExternal size={12} color="gray" />
						</Space>
					</Link>
				),
			},
			{ type: "divider" },
			{
				style: { display: isOpenedInTelegram ? "none" : "block" },
				label: "Logout",
				key: "logout",
				danger: true,
				onClick: () => signOut({ redirect: true, callbackUrl: "/" }),
			},
		];

		return screens.lg
			? menu
			: [...inlineMenuItems, { type: "divider" }, ...menu];
	}, [isOpenedInTelegram, screens, session]);

	const menuItems: (ItemType & { disabled: boolean })[] = [
		{
			key: `/my/events/${eventId}`,
			disabled: false,
			label: (
				<Link href={`/my/events/${eventId}`}>
					{t("app.user-event.menu.schedule", "Schedule")}
				</Link>
			),
		},
		{
			key: `/my/events/${eventId}/Content`,
			disabled: false,
			label: (
				<Link href={`/my/events/${eventId}/Content`}>
					{t("app.user-event.menu.Content", "Content")}
				</Link>
			),
		},
		{
			key: `/my/events/${eventId}/members`,
			disabled: false,
			label: (
				<Link href={`/my/events/${eventId}/members`}>
					{t("app.user-event.menu.members", "Members")}
				</Link>
			),
		},
		{
			key: `/my/events/${eventId}/live-room`,
			disabled: false,
			label: (
				<Link href={`/my/events/${eventId}/live-room`}>
					{t("app.user-event.menu.live-room", "Live room")}
				</Link>
			),
		},
		{
			key: `/my/events/${eventId}/settings/general`,
			disabled: !isEventAuthor,
			label: (
				<Link href={`/my/events/${eventId}/settings/general`}>
					{t("app.user.menu.settings", "Settings")}
				</Link>
			),
		},
		{
			key: `/event/${event?.slug}`,
			disabled: false,
			className: styles.publicPageMenuItem,
			label: (
				<Link
					href={`/event/${event?.slug}`}
					target="_blank"
					rel="noopener noreferrer"
				>
					{t("Public page", "Public page")} <GoLinkExternal size={14} />
				</Link>
			),
		},
	];

	if (isFetched && !event) {
		return (
			<ProtectedLayout>
				<NextSeo title="Error 404" nofollow noindex />
				<Error404
					callbackUrl={"/hub"}
					textBackButton="Back to Hub"
					theme="light"
					containerStyle={{ height: "50vh" }}
				/>
			</ProtectedLayout>
		);
	}

	return (
		<EventContext.Provider
			value={{ contextEvent, isLoaded: isFetched, setContextEvent }}
		>
			<NextSeo {...seoSettings} />
			<ConfigProvider
				theme={appThemeConfig}
				locale={getLanguage() == "en" ? enLocale : ruLocale}
			>
				<style jsx global>{`
					:root {
						--background-color: #fafafa;
					}
				`}</style>
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
											title: screens.md ? (
												<Link href="/hub">{t("hub.menu.home", "Hub")}</Link>
											) : null,
										},
										{
											title: (
												<Text ellipsis={{ tooltip: true }}>
													{event?.title || "Event"}
												</Text>
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
														) : (
															<ReactNiceAvatar
																style={{ width: "32px", height: "32px" }}
																{...avatarConfig}
															/>
														)
													}
												></Button>
											</Dropdown>
										</>
									) : (
										<>
											<NotificationsBell />
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
							items={menuItems.filter((r) => !r.disabled)}
							mode="horizontal"
							selectedKeys={[router.asPath]}
							className={styles.appMenu}
						/>
					</Header>
					<Content className={styles.contentContainer}>
						<div className={styles.content}>
							<Flex
								justify="space-between"
								align="center"
								style={{ marginBottom: 24 }}
							>
								<Space
									direction="vertical"
									size={0}
									style={{ marginBottom: 24 }}
								>
									{!!title && <Title style={{ margin: 0 }}>{title}</Title>}
									{!!description && <Text type="secondary">{description}</Text>}
								</Space>
								{actions}
							</Flex>

							{children}
						</div>
					</Content>
				</Layout>
				{!screens.lg && (
					<Drawer
						className={styles.mobileMenuDrawer}
						height={"100%"}
						title={
							<Space>
								<Avatar
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
				)}
				<FloatButton.BackTop
					icon={<GoArrowUp />}
					rootClassName={styles.backTop}
					description="Scroll to up"
				/>
			</ConfigProvider>
		</EventContext.Provider>
	);
};
