"use client";

import { IconMenu2 } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import type { MenuProps } from "antd";
import { Button, Dropdown, Grid, Space } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ReactNiceAvatar, { type AvatarFullConfig } from "react-nice-avatar";
import { ChatPanel } from "@/components/Chat/ChatPanel";
import { ChatButton } from "@/components/ChatButton";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { AppImage } from "@/components/ui/AppImage";

const NotificationsBell = dynamic(
	() =>
		import("@/components/NotificationsBell").then((m) => m.NotificationsBell),
	{ ssr: false },
);

const DOCS_URL = "https://docs.gdhub.io";

type HeaderActionsProps = {
	dropdownMenuItems: MenuProps["items"];
	onOpenMobileMenu: () => void;
	/** When provided, falls back to a generated avatar instead of nothing. */
	avatarConfig?: AvatarFullConfig;
};

/**
 * Right-side actions of the authenticated header (documentation, chat,
 * notifications, user menu) — shared by every layout. The header structure
 * lives in `Header`; this fills its `actions` slot. Reads breakpoints/session
 * from hooks itself. Not used in Storybook: ChatButton / NotificationsBell need
 * session / react-query / websocket context.
 */
export const HeaderActions = ({
	dropdownMenuItems,
	onOpenMobileMenu,
	avatarConfig,
}: HeaderActionsProps) => {
	const { t } = useTranslate();
	const screens = Grid.useBreakpoint();
	const { data: session } = useSession();

	const avatar = session?.user?.image ? (
		<AppAvatar
			size={32}
			src={
				<AppImage
					src={session.user.image}
					width={32}
					height={32}
					alt="avatar"
				/>
			}
		/>
	) : avatarConfig ? (
		<ReactNiceAvatar
			style={{ width: "32px", height: "32px" }}
			{...avatarConfig}
		/>
	) : null;

	if (!screens.xl) {
		return (
			<ChatPanel>
				<Space align="center" size={8}>
					<NotificationsBell />
					<ChatButton />
					<Button
						type="text"
						shape="circle"
						style={{ top: 2 }}
						onClick={onOpenMobileMenu}
					>
						<IconMenu2 />
					</Button>
				</Space>
			</ChatPanel>
		);
	}

	// On smaller desktops/tablets keep the right side compact: drop the
	// standalone "Documentation" button and surface it inside the user dropdown.
	const showDocsButton = !!screens.xxl;
	const menuItems: MenuProps["items"] = showDocsButton
		? dropdownMenuItems
		: [
				{
					key: "header-docs",
					label: (
						<Link href={DOCS_URL} target="_blank">
							{t("hub.menu.documentation", "Documentation")}
						</Link>
					),
				},
				...(dropdownMenuItems ?? []),
			];

	// The chat panel hangs from the whole row, so it ends under the avatar.
	return (
		<ChatPanel>
			<Space align="center" size={8}>
				{showDocsButton && (
					<Link href={DOCS_URL} target="_blank">
						<Button type="text" style={{ fontSize: 14 }}>
							{t("hub.menu.documentation", "Documentation")}
						</Button>
					</Link>
				)}
				<ChatButton />
				<NotificationsBell />
				<Dropdown menu={{ items: menuItems }} trigger={["click"]}>
					<Button
						type="text"
						shape="circle"
						style={{
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							padding: 0,
							lineHeight: 0,
						}}
						icon={avatar}
					/>
				</Dropdown>
			</Space>
		</ChatPanel>
	);
};

export default HeaderActions;
