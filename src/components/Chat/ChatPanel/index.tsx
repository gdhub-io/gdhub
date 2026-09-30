"use client";

import { Drawer, Grid, Popover } from "antd";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { useHideCrispWidget } from "@/hooks/useHideCrispWidget";
import { useChat } from "../useChat";
import styles from "./ChatPanel.module.scss";

const ChatPanelBody = dynamic(() => import("./ChatPanelBody"), {
	ssr: false,
});

// Menus, popovers and confirms opened from inside the panel live in portals of
// their own; a click there is still a click "in" the chat.
const PANEL_PORTALS =
	".ant-popover, .ant-dropdown, .ant-modal-root, .ant-tooltip, .ant-message, .ant-notification, .ant-select-dropdown";

/**
 * The chat, anchored to the header launcher: a floating panel on desktop and a
 * full-screen sheet below `md`. The open state lives in `useChat`, so deep
 * links, toasts and "Open chat" buttons elsewhere open it too.
 */
export function ChatPanel({ children }: { children: ReactNode }) {
	const screens = Grid.useBreakpoint();
	const desktop = !!screens.md;
	const open = useChat((s) => s.openChatModal);
	const panelRef = useRef<HTMLDivElement>(null);
	const anchorRef = useRef<HTMLSpanElement>(null);
	const pathname = usePathname();
	const lastPathname = useRef(pathname);

	// the Crisp bubble sits in the same corner and covers the composer
	useHideCrispWidget(open);

	useEffect(() => {
		if (lastPathname.current === pathname) return;
		lastPathname.current = pathname;
		useChat.getState().setOpenChatModal(false);
	}, [pathname]);

	useEffect(() => {
		if (!open || !desktop) return;
		const close = () => useChat.getState().setOpenChatModal(false);
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Element;
			if (
				panelRef.current?.contains(target) ||
				anchorRef.current?.contains(target) ||
				target.closest?.(PANEL_PORTALS)
			) {
				return;
			}
			close();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			if ((event.target as Element).closest?.(".ant-modal-root")) return;
			close();
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open, desktop]);

	if (!desktop) {
		return (
			<>
				{children}
				<Drawer
					open={open}
					placement="bottom"
					size="100%"
					closable={false}
					onClose={() => useChat.getState().setOpenChatModal(false)}
					styles={{ body: { padding: 0 } }}
				>
					<ChatPanelBody />
				</Drawer>
			</>
		);
	}

	return (
		<Popover
			open={open}
			trigger={[]}
			placement="bottomRight"
			arrow={false}
			classNames={{ container: styles.popover }}
			content={
				<div ref={panelRef}>
					<ChatPanelBody />
				</div>
			}
		>
			<span ref={anchorRef} className={styles.anchor}>
				{children}
			</span>
		</Popover>
	);
}
