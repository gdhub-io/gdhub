import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { AiOutlineClose } from "@react-icons/all-files/ai/AiOutlineClose";
import { AiOutlineMenu } from "@react-icons/all-files/ai/AiOutlineMenu";
import { GoArrowUp } from "@react-icons/all-files/go/GoArrowUp";
import { GoLinkExternal } from "@react-icons/all-files/go/GoLinkExternal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
	message,
	Row,
	Space,
	Typography,
} from "antd";
import type { ItemType } from "antd/es/menu/interface";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import axios from "axios";
import dayjs from "dayjs";
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
import { type ContextCourse, CourseContext } from "@/contexts/CourseContext";
import { hasRole } from "@/helpers/user";
import { useTelegram } from "@/helpers/useTelegram";
import { useCurrentCourse } from "@/hooks/course";
import { ProtectedLayout } from "../ProtectedLayout";
import styles from "./style.module.scss";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export const ProtectedCourseLayout = ({
	title,
	description,
	seo,
	children,
	actions,
	customStyles,
}: {
	title?: string;
	description?: string;
	seo?: NextSeoProps;
	children: ReactNode;
	actions?: ReactNode;
	customStyles?: {
		contentContainer?: React.CSSProperties;
		content?: React.CSSProperties;
	};
}) => {
	const { t } = useTranslate();
	const router = useRouter();
	const queryClient = useQueryClient();
	const courseId = router.query.courseId as string;
	const [messageApi, messageContextHolder] = message.useMessage();
	const [contextCourse, setContextCourse] = useState<ContextCourse>();
	const [openMobileMenu, setOpenMobileMenu] = useState(false);
	const [isOpenedInTelegram] = useTelegram();
	const screens = Grid.useBreakpoint();
	const { data: session }: any = useSession();
	const { changeLanguage, getLanguage } = useTolgee();

	const { course, isFetched } = useCurrentCourse();
	const isCourseAuthor = useMemo(
		() => course?.createdById === session?.user.id,
		[course, session?.user],
	);

	useEffect(() => {
		if (!course) return;

		setContextCourse({
			id: course.id,
			name: course.name,
			isCourseAuthor,
		});
	}, [course, isCourseAuthor]);

	const seoSettings: NextSeoProps = {
		title: title || "Course",
		canonical: process.env.NEXT_PUBLIC_APP_URL + router.asPath,
		nofollow: true,
		noindex: true,
		description,
		...seo,
	};

	const { mutateAsync: publishCourse, isPending: isPublishingCourse } =
		useMutation({
			mutationFn: (id: string) => axios.put(`/api/user/course/${id}/publish`),
			onSuccess: () => {
				messageApi.success(t("course.publish.success", "Course published"));
				queryClient.invalidateQueries({ queryKey: ["course", courseId] });
			},
			onError: () => {
				message.error(t("course.publish.error", "Error publishing course"));
			},
		});

	const { mutateAsync: unpublishCourse, isPending: isUnpublishingCourse } =
		useMutation({
			mutationFn: (id: string) => axios.put(`/api/user/course/${id}/unpublish`),
			onSuccess: () => {
				messageApi.success(t("course.unpublish.success", "Course unpublished"));
				queryClient.invalidateQueries({ queryKey: ["course", courseId] });
			},
			onError: () => {
				message.error(t("course.unpublish.error", "Error unpublishing course"));
			},
		});

	const handleCoursePublish = async (id: string) => {
		await publishCourse(id);
	};

	const handleCourseUnpublish = async (id: string) => {
		await unpublishCourse(id);
	};

	useEffect(() => {
		if (session?.user.lang)
			changeLanguage(session.user.lang).then((d) =>
				console.info("language is changed"),
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
			key: `/my/courses/${courseId}/schedule`,
			disabled: false,
			label: (
				<Link href={`/my/courses/${courseId}/schedule`}>
					{t("app.user-course.menu.schedule", "Schedule")}
				</Link>
			),
		},
		{
			key: `/my/courses/${courseId}/content`,
			disabled: false,
			label: (
				<Link href={`/my/courses/${courseId}/content`}>
					{t("app.user-course.menu.content", "Content")}
				</Link>
			),
		},
		{
			key: `/my/courses/${courseId}/members`,
			disabled: false,
			label: (
				<Link href={`/my/courses/${courseId}/members`}>
					{t("app.user-course.menu.members", "Members")}
				</Link>
			),
		},
		// {
		// 	key: `/my/courses/${courseId}/live-room`,
		// 	disabled: false,
		// 	label: (
		// 		<Link href={`/my/courses/${courseId}/live-room`}>
		// 			{t("app.user-course.menu.live-room", "Live room")}
		// 		</Link>
		// 	),
		// },
		{
			key: `/my/courses/${courseId}/settings/general`,
			disabled: !isCourseAuthor,
			label: (
				<Link href={`/my/courses/${courseId}/settings/general`}>
					{t("app.user.menu.settings", "Settings")}
				</Link>
			),
		},
		{
			key: `/course/${course?.slug}`,
			disabled: false,
			className: styles.publicPageMenuItem,
			label: (
				<>
					<Space wrap={true}>
						{course?.status === prismaClient.$Enums.CourseStatus.Draft && (
							<Space wrap={true}>
								<Text type="secondary">The course is not published yet</Text>
								<Button
									type="primary"
									size="small"
									onClick={() => handleCoursePublish(courseId)}
									loading={isPublishingCourse}
								>
									{t("course.button.publish", "Publish")}
								</Button>
							</Space>
						)}

						<Button
							type="text"
							size="small"
							href={`${course?.language ? `/${course?.language}` : ""}/course/${course?.slug}`}
							target="_blank"
						>
							{t("course.button.publicPage", "Go to page")}
							<GoLinkExternal size={12} color="gray" />
						</Button>

						{course?.status === prismaClient.$Enums.CourseStatus.Published && (
							<Space wrap={true}>
								{/* <Text type="secondary">
									The course is published at{" "}
									{dayjs(course?.publishedAt).format("lll")}
								</Text> */}
								<Button
									type="default"
									size="small"
									onClick={() => handleCourseUnpublish(courseId)}
									loading={isUnpublishingCourse}
								>
									{t("course.button.unpublish", "Unpublish")}
								</Button>
							</Space>
						)}
					</Space>
				</>
			),
		},
	];

	if (isFetched && !course) {
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
		<CourseContext.Provider
			value={{ contextCourse, isLoaded: isFetched, setContextCourse }}
		>
			{messageContextHolder}
			<NextSeo {...seoSettings} />
			<ConfigProvider
				theme={appThemeConfig}
				locale={getLanguage() == "en" ? enLocale : ruLocale}
			>
				<style jsx global>{`
					:root {
						--background-color: #fafafa;
						--wx-font-family: ${appThemeConfig?.token?.fontFamily}, sans-serif !important;
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
												<Link href="/hub/courses/my">
													{t("hub.menu.my-courses", "My courses")}
												</Link>
											) : null,
										},
										{
											title: (
												<div style={{ display: "grid" }}>
													<Text ellipsis={{ tooltip: true }}>
														{course?.name || "Course"}
													</Text>
												</div>
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
					<Content
						className={styles.contentContainer}
						style={customStyles?.contentContainer}
					>
						<div className={styles.content} style={customStyles?.content}>
							<Flex
								justify="space-between"
								align="center"
								style={{ marginBottom: 24 }}
								wrap={true}
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
		</CourseContext.Provider>
	);
};
