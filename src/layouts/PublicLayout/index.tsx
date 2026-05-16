import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { AiOutlineClose } from "@react-icons/all-files/ai/AiOutlineClose";
import { TbBrandTelegram } from "@react-icons/all-files/tb/TbBrandTelegram";
import { useTolgee } from "@tolgee/react";
import {
	Avatar,
	Button,
	ConfigProvider,
	Drawer,
	Flex,
	Grid,
	Layout,
	Menu,
	type MenuProps,
	Space,
	Tooltip,
	Typography,
} from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import { NextSeo, type NextSeoProps } from "next-seo";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import HeroBgImage from "@/assets/images/landing/hero-bg.png";
import PublicHeaderBg from "@/assets/images/public-header-bg.png";
import { MainFooter } from "@/components/MainFooter";
import { MainHeader } from "@/components/MainHeader";
import { publicThemeConfig } from "@/config/theme";
import { hasRole } from "@/helpers/user";
import { useTelegram } from "@/helpers/useTelegram";
import styles from "./style.module.scss";

interface PublicLayoutProps {
	children: ReactNode;
	title?: ReactNode;
	seo?: NextSeoProps;
	subTitle?: string;
	subLine?: ReactNode;
	backgroundImage?: string;
	extra?: ReactNode;
	extraPosition?: "left" | "top";
	extraGap?: number;
	styles?: Record<string, object>;
	ogImageType?: string;
	ogImageParams?: Record<string, string>;
}

const { Header, Footer, Content } = Layout;
const { Text, Title } = Typography;

export const PublicLayout = ({
	children,
	title,
	seo,
	subTitle,
	backgroundImage,
	extra,
	extraPosition = "left",
	extraGap = 16,
	subLine,
	styles: layoutStyles,
	ogImageType,
	ogImageParams,
}: PublicLayoutProps) => {
	const router = useRouter();
	const { t, getLanguage } = useTolgee();
	const [openMobileMenu, setOpenMobileMenu] = useState(false);
	const [isOpenedInTelegram] = useTelegram();
	const screens = Grid.useBreakpoint();
	const { data: session }: any = useSession();

	const seoParams: NextSeoProps = {
		title: seo?.title || (typeof title === "string" ? title : ""),
		description: seo?.description || subTitle,
		canonical: process.env.NEXT_PUBLIC_APP_URL + router.asPath,
		openGraph: {
			images: [
				{
					url: seo?.openGraph?.images?.length
						? seo?.openGraph.images[0].url
						: `${process.env.NEXT_PUBLIC_APP_URL}/api/og${ogImageType ? `-${ogImageType}` : ""}?t=${encodeURIComponent(seo?.title || (typeof title === "string" ? title : ""))}&st=${t(
								seo?.description || subTitle || "",
							)}&img=${
								backgroundImage
									? backgroundImage.startsWith("http")
										? backgroundImage
										: process.env.NEXT_PUBLIC_APP_URL + backgroundImage
									: process.env.NEXT_PUBLIC_APP_URL + HeroBgImage.src
							}&${Object.entries(ogImageParams || {})
								.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
								.join("&")}`,
					alt: "Indie Game Developers Page Cover",
				},
			],
		},
		...seo,
	};

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

	const telegramMenuItem = {
		label: screens.lg ? (
			<Tooltip title={t("Community chat on Telegram")}>
				<Link href={linkToChat} target="_blank" title={t("Community Chat")}>
					<Button
						shape="circle"
						type="text"
						style={{ top: "6px", position: "relative" }}
					>
						<TbBrandTelegram size={24} />
					</Button>
				</Link>
			</Tooltip>
		) : (
			<Link
				href="https://t.me/+HD91s6-i7uAwZDIy"
				target="_blank"
				title={t("Community Chat")}
			>
				{t("Community chat on Telegram")}
			</Link>
		),
		key: "telegram-join-link",
	};

	useEffect(() => {
		if (!screens.lg) setOpenMobileMenu(false);
	}, [session, screens]);

	const publicMenuItems: any = useMemo(
		() => [
			{
				label: (
					<Link href="/projects" title="Projects">
						{screens.lg ? (
							<Button type="text">{t("Projects", "Projects")}</Button>
						) : (
							t("Projects", "Projects")
						)}
					</Link>
				),
				key: "/projects",
			},
			{
				label: (
					<Link href="/vacancies" title="Vacancies">
						{screens.lg ? (
							<Button type="text">{t("Vacancies", "Vacancies")}</Button>
						) : (
							t("Vacancies", "Vacancies")
						)}
					</Link>
				),
				key: "/vacancies",
			},
		],
		[screens],
	);

	const headerMenu: MenuProps["items"] = useMemo(
		() => [
			{
				label: (
					<Link href="#about" title={t("About us")}>
						{t("About us", "About us")}
					</Link>
				),
				key: "#about",
			},
			{
				label: (
					<Link href="#for-authors" title={t("For Authors")}>
						{t("For Authors", "For Authors")}
					</Link>
				),
				key: "#for-authors",
			},
			{
				label: (
					<Link href="#for-specialists" title={t("For Specialists")}>
						{t("For Specialists", "For Specialists")}
					</Link>
				),
				key: "#for-specialists",
			},
			{
				label: (
					<Link href="#contacts" title={t("Contacts")}>
						{t("Contacts", "Contacts")}
					</Link>
				),
				key: "#contacts",
			},
		],
		[screens, session],
	);

	const inlineMenuItems: MenuProps["items"] = useMemo(() => {
		let menu: MenuProps["items"] = [
			{
				style: { display: screens.lg ? "none" : "block" },
				label: (
					<Link href="/hub" title={t("Main Page")}>
						{screens.lg ? (
							<Button type="primary">{t("Home", "Home")}</Button>
						) : (
							t("Home", "Home")
						)}
					</Link>
				),
				key: "/hub",
			},
			...publicMenuItems,
			{
				label: (
					<Link
						href="https://docs.gdhub.io"
						target="_blank"
						title={t("Documentation")}
					>
						{screens.lg ? (
							<Button type="primary">
								{t("Documentation", "Documentation")}
							</Button>
						) : (
							<strong>{t("Documentation", "Documentation")}</strong>
						)}
					</Link>
				),
				key: "/hub/docs",
			},
			telegramMenuItem,
		];

		if (
			!!session &&
			session?.user?.roles.includes(prismaClient.UserRole.Member)
		) {
			menu = [
				menu[0],
				{
					label: (
						<Link href="/hub/members" title={t("Community Members")}>
							{screens.lg ? (
								<Button type="text">{t("Members", "Members")}</Button>
							) : (
								t("Members", "Members")
							)}
						</Link>
					),
					key: "/hub/members",
				},
				// {
				// 	label: (
				// 		<Link href="/hub/lectures" title={t('Community Lectures')}>
				// 			{screens.lg ? (
				// 				<Button type="text">
				// 					{t('Lectures', 'Lectures')}
				// 				</Button>
				// 			) : (
				// 				{t('Lectures', 'Lectures')}
				// 			)}
				// 		</Link>
				// 	),
				// 	key: '/hub/lectures',
				// },
				...menu.slice(1),
			];
		}

		return menu;
	}, [screens, session]);

	const dropdownMenuItems: MenuProps["items"] = useMemo(() => {
		let menu: MenuProps["items"] = [];

		if (hasRole(prismaClient.UserRole.Admin, { data: session })) {
			menu.push({
				label: (
					<Link href="/admin/seasons">
						{t("Administration", "Administration")}
					</Link>
				),
				key: "/admin/seasons",
			});
		}

		menu = [
			...menu,
			{
				label: <Link href="/profile">{t("Profile", "Profile")}</Link>,
				key: "profile",
			},
			{
				style: { display: isOpenedInTelegram ? "none" : "block" },
				label: t("Sign out"),
				key: "logout",
				danger: true,
				onClick: () => signOut(),
			},
		];

		return screens.lg
			? menu
			: [...inlineMenuItems, { type: "divider" }, ...menu];
	}, [isOpenedInTelegram, screens, session]);

	const setBackground = useCallback(() => {
		if (title && !backgroundImage) return `url(${PublicHeaderBg.src})`;
		if (backgroundImage)
			return `linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.85) 40%, rgba(117, 19, 93, 0.3)), url(${backgroundImage})`;
	}, [title, backgroundImage]);

	return (
		<>
			<NextSeo {...seoParams} />
			<ConfigProvider
				theme={publicThemeConfig}
				locale={getLanguage() == "en" ? enLocale : ruLocale}
			>
				<style jsx global>{`
					:root {
						--background-color: #f2f4f7;
					}
				`}</style>
				<Layout className={styles.container}>
					<Header
						className={styles.header}
						style={{
							backgroundImage: setBackground(),
							position: "relative",
						}}
					>
						{/* {backgroundImage && <div className={styles.headerBlur} />} */}
						<MainHeader />
						<div className={styles.titleContainer}>
							<Flex
								align={extraPosition === "top" ? "start" : "center"}
								gap={extraGap}
								vertical={extraPosition === "top"}
							>
								{extra}
								{!!title && (
									<Title
										className={
											extraPosition === "top" ? styles.titleTop : styles.title
										}
									>
										{title}
									</Title>
								)}
							</Flex>
							{!!subTitle && <div className={styles.subTitle}>{subTitle}</div>}
							{!!subLine && subLine}
						</div>
					</Header>
					<Content style={layoutStyles?.content}>
						<div
							className="layout-background"
							style={layoutStyles?.layoutBackground}
						>
							{children}
						</div>
					</Content>
					<Footer className={styles.footer}>
						<MainFooter />
					</Footer>
				</Layout>

				{!screens.lg && (
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
							<Button onClick={() => setOpenMobileMenu(false)} type="text">
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
			</ConfigProvider>
		</>
	);
};
