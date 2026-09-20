import { IconX } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Button,
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
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { MainFooter } from "@/components/MainFooter";
import { MainHeader } from "@/components/MainHeader";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { InverseBand } from "@/components/ui/InverseBand";
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
	const pathname = usePathname();
	const [openMobileMenu, setOpenMobileMenu] = useState(false);
	const [scrollY, setScrollY] = useState(0);
	const screens = Grid.useBreakpoint();
	const { data: session, status: authStatus }: any = useSession();

	useEffect(() => {
		if (document.location.hash) {
			setTimeout(() => {
				scrollIntoViewWithOffset(document.location.hash, 100);
			}, 300);
		}
	}, [pathname]);

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
			{/* The landing is dark end to end, so the whole shell is the band. */}
			<InverseBand>
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
						afterOpenChange={handleOpenMobileMenu}
						closeIcon={<IconX size={24} />}
						title={
							!!session && (
								<Flex align="center" justify="space-between">
									<AppAvatar
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
						<Space orientation="vertical" size={32} style={{ width: "100%" }}>
							<Menu
								items={headerMenu}
								onSelect={() => setOpenMobileMenu(false)}
							/>

							{mainButtonInDrawer}
						</Space>
					</Drawer>
				)}
			</InverseBand>
		</>
	);
};
