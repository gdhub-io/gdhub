"use client";

import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { AiOutlineClose } from "@react-icons/all-files/ai/AiOutlineClose";
import { TbBrandTelegram } from "@react-icons/all-files/tb/TbBrandTelegram";
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
	Tooltip,
} from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { MainFooter } from "@/components/MainFooter";
import { publicThemeConfig } from "@/config/theme";
import { hasRole } from "@/helpers/user";
import { useTelegram } from "@/helpers/useTelegram";
import styles from "./style.module.scss";

const { Footer, Content } = Layout;

/**
 * Общая обвязка публичных страниц: AntD ConfigProvider, MainHeader, MainFooter,
 * мобильный Drawer. Используется в `app/(public)/layout.tsx`.
 *
 * Per-page hero (заголовок, фон, subTitle) рендерится не здесь —
 * страницы вставляют <PublicPageHeader> в своё содержимое.
 */
export function PublicShell({ children }: { children: ReactNode }) {
	const { t, getLanguage } = useTolgee();
	const [openMobileMenu, setOpenMobileMenu] = useState(false);
	const [isOpenedInTelegram] = useTelegram();
	const screens = Grid.useBreakpoint();
	const { data: session } = useSession();

	const linkToChat = useMemo(() => {
		switch (getLanguage()) {
			case "en":
				return "https://t.me/gdhub_en";
			case "ru":
				return "https://t.me/gdhub_io";
			default:
				return "";
		}
	}, [getLanguage]);

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
	}, [screens]);

	const publicMenuItems: MenuProps["items"] = useMemo(
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
		[screens.lg, t],
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
			(session as { user?: { roles?: string[] } })?.user?.roles?.includes(
				prismaClient.UserRole.Member,
			)
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
				...menu.slice(1),
			];
		}

		return menu;
	}, [screens.lg, session, publicMenuItems, t, telegramMenuItem]);

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
	}, [isOpenedInTelegram, screens.lg, session, inlineMenuItems, t]);

	return (
		<ConfigProvider
			theme={publicThemeConfig}
			locale={getLanguage() === "en" ? enLocale : ruLocale}
		>
			<style jsx global>{`
				:root {
					--background-color: #f2f4f7;
				}
			`}</style>
			<Layout className={styles.container}>
				<Content>{children}</Content>
				<Footer className={styles.footer}>
					<MainFooter />
				</Footer>
			</Layout>

			{!screens.lg && (
				<Drawer
					className={styles.mobileMenuDrawer}
					title={
						<Space>
							<Avatar
								src={
									(session as { user?: { image?: string | null } } | null)?.user
										?.image ?? undefined
								}
								shape="square"
							/>
							<div className="username">
								{(session as { user?: { name?: string | null } } | null)?.user
									?.name ?? ""}
							</div>
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
	);
}
