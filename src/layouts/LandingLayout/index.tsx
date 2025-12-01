import { AiOutlineClose } from "@react-icons/all-files/ai/AiOutlineClose";
import { useTranslate } from "@tolgee/react";
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
	Skeleton,
	Space,
	Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { NextSeo, type NextSeoProps } from "next-seo";
import { useEffect, useMemo, useState } from "react";
import { MainFooter } from "@/components/MainFooter";
import { MainHeader } from "@/components/MainHeader";
import { landingThemeConfig } from "@/config/theme";
import styles from "./style.module.scss";

const { Header, Footer, Content } = Layout;
const { Text } = Typography;

const scrollIntoViewWithOffset = (selector: string, offset: number) => {
	const hookEl = document?.querySelector(selector);

	if (!hookEl) return;

	window.scrollTo({
		behavior: "smooth",
		top:
			hookEl.getBoundingClientRect().top -
			document.body.getBoundingClientRect().top -
			offset,
	});
};

export const LandingLayout = ({ children }: any) => {
	const { t } = useTranslate();
	const router = useRouter();
	const [openMobileMenu, setOpenMobileMenu] = useState(false);
	const [scrollY, setScrollY] = useState(0);
	const screens = Grid.useBreakpoint();
	const { data: session, status: authStatus }: any = useSession();

	const seoSettings: NextSeoProps = {
		title: t("landing.seo.title", "Game Developers Hub"),
		description: t(
			"landing.seo.description",
			"Game Developers Hub is a platform for game developers and specialists.",
		),
		canonical: process.env.NEXT_PUBLIC_APP_URL + router.asPath,
		openGraph: {
			title: t("landing.seo.title", "Game Developers Hub"),
			description: t(
				"landing.seo.description",
				"Game Developers Hub is a platform for game developers and specialists.",
			),
			type: "website",
			url: process.env.NEXT_PUBLIC_APP_URL + router.asPath,
		},
	};

	useEffect(() => {
		if (document.location.hash) {
			setTimeout(() => {
				scrollIntoViewWithOffset(document.location.hash, 100);
			}, 300);
		}
	}, [router]);

	useEffect(() => {
		if (!screens.xl) setOpenMobileMenu(false);
	}, [session, screens]);

	useEffect(() => {
		const unsetOverflow = () => {
			if (typeof window !== "undefined") {
				const body = document?.querySelector("body");
				body?.style.setProperty("overflow", "unset");
			}
		};

		const handleScroll = () => {
			setScrollY(window.scrollY);
		};

		handleScroll();
		unsetOverflow();

		window.addEventListener("scroll", handleScroll);
		return () => {
			unsetOverflow();
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	// hide main scroll on open menu
	useEffect(() => {
		const body = document?.querySelector("body");

		if (openMobileMenu) {
			body?.style.setProperty("overflow", "hidden");
		}
	}, [openMobileMenu]);

	// show main scroll on open menu
	const handleOpenMobileMenu = (open: boolean) => {
		const body = document?.querySelector("body");

		if (!open) {
			body?.style.setProperty("overflow", "unset");
		}
	};

	const headerMenu: MenuProps["items"] = useMemo(
		() => [
			{
				label: (
					<Link href="#about" title={t("About us")}>
						{t("landing.menu.aboutUs", "About us")}
					</Link>
				),
				key: "#about",
			},
			{
				label: (
					<Link href="#for-authors" title={t("For Authors")}>
						{t("landing.menu.forAuthors", "For Authors")}
					</Link>
				),
				key: "#for-authors",
			},
			{
				label: (
					<Link href="#for-specialists" title={t("For Specialists")}>
						{t("landing.menu.forSpecialists", "For Specialists")}
					</Link>
				),
				key: "#for-specialists",
			},
			{
				label: (
					<Link href="#contacts" title={t("Contacts")}>
						{t("landing.menu.contacts", "Contacts")}
					</Link>
				),
				key: "#contacts",
			},
		],
		[screens, session],
	);

	const mainButtonInDrawer = useMemo(() => {
		if (authStatus === "loading") {
			return <Skeleton.Button active size="large" />;
		}

		if (authStatus === "unauthenticated") {
			return (
				<Link href="/signin">
					<Button type="primary" style={{ width: "100%" }}>
						{t("landing.menu.logIn", "Log in")}
					</Button>
				</Link>
			);
		}

		if (authStatus === "authenticated") {
			return (
				<Link href="/hub">
					<Button type="primary" style={{ width: "100%" }}>
						{t("landing.menu.goToApp", "Go to app")}
					</Button>
				</Link>
			);
		}
	}, [authStatus]);

	return (
		<>
			<NextSeo {...seoSettings} />
			<ConfigProvider theme={landingThemeConfig}>
				<Layout className={styles.container}>
					<Header className={scrollY > 0 ? styles.fixedHeader : styles.header}>
						<MainHeader />
					</Header>
					<Content className={styles.content}>{children}</Content>
					<Footer className={styles.footer}>
						<MainFooter />
					</Footer>
				</Layout>

				{!screens.xl && (
					<Drawer
						className={styles.mobileMenuDrawer}
						height={"100%"}
						afterOpenChange={handleOpenMobileMenu}
						closeIcon={<AiOutlineClose size={24} />}
						title={
							!!session && (
								<Flex align="center" justify="space-between">
									<Avatar
										src={session.user?.image ?? undefined}
										shape="square"
									/>
									<Text className="username" ellipsis>
										{session.user?.name}
									</Text>
									{/* <SwitchLanguage border={true} size="small" /> */}
								</Flex>
							)
						}
						placement="right"
						onClose={() => setOpenMobileMenu(false)}
						open={openMobileMenu}
					>
						<Space direction="vertical" size={32} style={{ width: "100%" }}>
							<Menu
								items={headerMenu}
								theme="dark"
								onSelect={() => setOpenMobileMenu(false)}
							/>

							{mainButtonInDrawer}
						</Space>
					</Drawer>
				)}
			</ConfigProvider>
		</>
	);
};
