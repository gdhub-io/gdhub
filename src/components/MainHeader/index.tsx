import { IconLogout, IconMenu2, IconX } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Drawer,
	Flex,
	Grid,
	Menu,
	type MenuProps,
	Skeleton,
	Space,
} from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import GdhubLogo from "@/assets/images/gdhub-beta-logo.svg";
import { signOutWithChat } from "@/components/Chat/session";
import { useCheckpointPurchaseOpen } from "@/contexts/CheckpointPurchaseContext";
import styles from "./style.module.scss";

export const MainHeader = ({ className }: { className?: string }) => {
	const { data: session, status: authStatus }: any = useSession();
	const screens = Grid.useBreakpoint();
	const router = useRouter();
	const pathname = usePathname();
	const { t } = useTranslate();
	const [openMobileMenu, setOpenMobileMenu] = useState(false);
	const [activeMenuKey, setActiveMenuKey] = useState<string>("");
	const checkpointOpen = useCheckpointPurchaseOpen();

	// hide mobile menu on resize window
	useEffect(() => {
		if (!screens.xl) setOpenMobileMenu(false);
	}, [screens]);

	// Set active menu item when page loads and when hash changes
	useEffect(() => {
		const handleHashChange = () => {
			if (window.location.hash) {
				setActiveMenuKey(window.location.hash);
				// Scroll to anchor after navigation
				if (pathname === "/") {
					setTimeout(() => {
						const element = document.querySelector(window.location.hash);
						if (element) {
							const offset = 100;
							window.scrollTo({
								behavior: "smooth",
								top:
									element.getBoundingClientRect().top + window.scrollY - offset,
							});
						}
					}, 100);
				}
			}
		};

		handleHashChange();
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, [pathname]);

	// hide main scroll on open menu
	useEffect(() => {
		const body = document?.querySelector("body");

		if (openMobileMenu) {
			body?.style.setProperty("overflow", "hidden");
		}
	}, [openMobileMenu]);

	const writeInternalLink = (internalLink: string) => {
		return pathname == "/" ? internalLink : `/${internalLink}`;
	};

	// Next re-renders the same route and leaves the reader halfway down the page.
	const scrollToTopIfHere = (
		e: React.MouseEvent<HTMLAnchorElement>,
		href: string,
	) => {
		if (pathname !== href) return;

		e.preventDefault();
		window.scrollTo({ behavior: "smooth", top: 0 });
		setOpenMobileMenu(false);
	};

	// Function for smooth scrolling to anchor
	const scrollToAnchor = (
		e: React.MouseEvent<HTMLAnchorElement>,
		selector: string,
	) => {
		if (!selector.startsWith("#")) return;

		const isHomePage = pathname === "/";

		// On non-home pages, navigate programmatically to "/#anchor" to avoid Menu swallowing link clicks
		if (!isHomePage) {
			e.preventDefault();
			router.push(`/#${selector.slice(1)}`);
			if (openMobileMenu) setOpenMobileMenu(false);
			return;
		}

		const offset = 100; // top offset
		const element = document.querySelector(selector);
		if (!element) return;

		// Smooth scroll on the same page
		e.preventDefault();
		window.scrollTo({
			behavior: "smooth",
			top: element.getBoundingClientRect().top + window.scrollY - offset,
		});

		setActiveMenuKey(selector);
		if (openMobileMenu) {
			setOpenMobileMenu(false);
		}
	};

	// show main scroll on open menu
	const handleOpenMobileMenu = (open: boolean) => {
		const body = document?.querySelector("body");

		if (!open) {
			body?.style.setProperty("overflow", "inherit");
		}
	};

	// The home page's audiences, grouped so the bar itself stays about products.
	const platformMenu: MenuProps["items"] = useMemo(
		() => [
			...[
				{
					hash: "#authors",
					label: t("public-menu.for-authors", "For Authors"),
				},
				{
					hash: "#talents",
					label: t("public-menu.for-talents", "For Talents"),
				},
				{ hash: "#scouts", label: t("public-menu.for-scouts", "For Scouts") },
				{
					hash: "#experts",
					label: t("public-menu.for-experts", "For Experts"),
				},
			].map(({ hash, label }) => ({
				label: (
					<Link
						href={writeInternalLink(hash)}
						title={label}
						onClick={(e) => scrollToAnchor(e, hash)}
					>
						{label}
					</Link>
				),
				key: hash,
			})),
		],
		[screens, session],
	);

	const headerMenu: MenuProps["items"] = useMemo(
		() => [
			{
				// A link, not a bare label: its anchors live on the home page.
				label: (
					<Link
						href="/"
						title={t("public-menu.platform", "Platform")}
						onClick={(e) => scrollToTopIfHere(e, "/")}
					>
						{t("public-menu.platform", "Platform")}
					</Link>
				),
				key: "platform",
				popupClassName: styles.menuPopup,
				children: platformMenu,
			},
			...(checkpointOpen
				? [
						{
							label: (
								<Link
									href="/checkpoint"
									title={t("public-menu.checkpoint", "Checkpoint")}
									onClick={(e) => scrollToTopIfHere(e, "/checkpoint")}
								>
									{t("public-menu.checkpoint", "Checkpoint")}
								</Link>
							),
							key: "/checkpoint",
						},
					]
				: []),
			{
				label: (
					<Link
						href="/projects"
						title={t("Video Games")}
						onClick={(e) => scrollToTopIfHere(e, "/projects")}
					>
						{t("public-menu.video-games", "Video Games")}
					</Link>
				),
				key: "/projects",
			},
			{
				label: (
					<Link
						href="/jobs"
						title={t("public-menu.jobs", "Open positions")}
						onClick={(e) => scrollToTopIfHere(e, "/jobs")}
					>
						🔥 {t("public-menu.jobs", "Open positions")}
					</Link>
				),
				key: "/jobs",
			},
			{
				label: (
					<Link
						href="/events"
						title={t("public-menu.events", "Events")}
						onClick={(e) => scrollToTopIfHere(e, "/events")}
					>
						{t("public-menu.events", "Events")}
					</Link>
				),
				key: "/events",
			},
		],
		[screens, session, platformMenu, checkpointOpen],
	);

	const actionButton = useMemo(() => {
		if (authStatus === "loading") {
			return (
				<div className={styles.actionButtonSkeleton}>
					<Skeleton.Button active size="large" block />
				</div>
			);
		}

		if (authStatus === "unauthenticated") {
			return (
				<Link href="/signin">
					<Button type="primary" className={styles.actionButton} block>
						{t("mainHeader.logIn", "Log in")}
					</Button>
				</Link>
			);
		}

		if (authStatus === "authenticated") {
			return (
				<Link href="/hub">
					<Button className={styles.actionButton} block>
						{t("mainHeader.goToApp", "Go to app")}
					</Button>
				</Link>
			);
		}
	}, [authStatus]);

	const logoutButton = useMemo(() => {
		if (authStatus === "authenticated") {
			return (
				<Button type="text" size="small" onClick={() => signOutWithChat()}>
					<IconLogout /> {t("mainHeader.logout", "Logout")}
				</Button>
			);
		}
	}, [authStatus]);

	return (
		<div className={[styles.container, className].join(" ")}>
			<Flex align="center" justify="space-between" className={styles.topLine}>
				{/* logo */}
				<Link href="/" className={styles.logo}>
					<GdhubLogo />
				</Link>
				{/* menu */}
				{screens.lg && (
					<div className={styles.menuContainer}>
						<Menu
							mode="horizontal"
							items={headerMenu}
							className={styles.menu}
							selectedKeys={[activeMenuKey]}
						/>
					</div>
				)}
				{/* right signin button */}
				{screens.lg && (
					<Space align="center" className={styles.rightControls}>
						{actionButton}
						{/* <SwitchLanguage /> */}
					</Space>
				)}
				{!screens.lg && (
					<Button
						type="text"
						className={styles.mobileMenuBtn}
						onClick={() => setOpenMobileMenu(true)}
					>
						<IconMenu2 size={24} />
					</Button>
				)}
			</Flex>

			{!screens.xl && (
				<Drawer
					className={styles.mobileMenuDrawer}
					afterOpenChange={handleOpenMobileMenu}
					closeIcon={<IconX size={24} />}
					title={
						<Flex justify="end" align="center" gap={16}>
							{logoutButton}
							{/* <SwitchLanguage border={true} size="small" /> */}
						</Flex>
					}
					placement="right"
					onClose={() => setOpenMobileMenu(false)}
					open={openMobileMenu}
				>
					<Space orientation="vertical" size={32} style={{ width: "100%" }}>
						<Menu
							items={headerMenu}
							mode="inline"
							onSelect={({ key }) => {
								setOpenMobileMenu(false);
								setActiveMenuKey(key);
							}}
							selectedKeys={[activeMenuKey]}
						/>

						{actionButton}
					</Space>
				</Drawer>
			)}
		</div>
	);
};
