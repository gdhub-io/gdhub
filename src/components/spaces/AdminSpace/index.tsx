"use client";

import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import {
	type SpaceHeaderConfig,
	useSetSpaceHeader,
} from "@/components/layouts/SpaceHeader";

const resolveSelectedMenuKey = (pathname: string) => {
	if (pathname.startsWith("/admin/post/")) return "/admin/posts";
	if (pathname.startsWith("/admin/workflow/")) return "/admin/workflows";
	if (pathname.startsWith("/admin/project-workflow/"))
		return "/admin/workflows";
	if (pathname.startsWith("/admin/audit-logs")) return "/admin/audit-logs";
	if (pathname.startsWith("/admin/devlog-posts")) return "/admin/devlog-posts";
	if (pathname.startsWith("/admin/posts")) return "/admin/posts";
	if (pathname.startsWith("/admin/workflows")) return "/admin/workflows";
	return "/admin/users";
};

const MENU_ITEMS: MenuProps["items"] = [
	{ key: "/admin/users", label: <Link href="/admin/users">Users</Link> },
	{ key: "/admin/posts", label: <Link href="/admin/posts">Posts</Link> },
	{
		key: "/admin/devlog-posts",
		label: <Link href="/admin/devlog-posts">DevLog Posts</Link>,
	},
	{
		key: "/admin/workflows",
		label: <Link href="/admin/workflows">Workflows</Link>,
	},
	{
		key: "/admin/audit-logs",
		label: <Link href="/admin/audit-logs">Audit logs</Link>,
	},
];

/**
 * Admin space chrome: swaps the app navigation for the admin sections. Access is
 * enforced server-side in `app/(app)/(spaces)/admin/layout.tsx`; header, chat
 * and theme come from the surrounding ProtectedShell.
 */
export const AdminSpace = ({ children }: { children: ReactNode }) => {
	const pathname = usePathname() ?? "";

	const spaceHeader: SpaceHeaderConfig = useMemo(
		() => ({
			menuItems: MENU_ITEMS,
			menuSelectedKeys: [resolveSelectedMenuKey(pathname)],
		}),
		[pathname],
	);

	useSetSpaceHeader(spaceHeader);

	return <>{children}</>;
};
