"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import {
	type SpaceHeaderConfig,
	useSetSpaceHeader,
} from "@/components/layouts/SpaceHeader";
import type { Permission } from "@/config/spaces";

const resolveSelectedMenuKey = (pathname: string) => {
	if (pathname.startsWith("/admin/post/")) return "/admin/posts";
	if (pathname.startsWith("/admin/workflow/")) return "/admin/workflows";
	if (pathname.startsWith("/admin/project-workflow/"))
		return "/admin/workflows";
	if (pathname.startsWith("/admin/roles")) return "/admin/roles";
	if (pathname.startsWith("/admin/audit-logs")) return "/admin/audit-logs";
	if (pathname.startsWith("/admin/devlog-posts")) return "/admin/devlog-posts";
	if (pathname.startsWith("/admin/events")) return "/admin/events";
	if (pathname.startsWith("/admin/posts")) return "/admin/posts";
	if (pathname.startsWith("/admin/workflows")) return "/admin/workflows";
	return "/admin/users";
};

/**
 * Every section with the permission that opens it. Staff is not one role — a
 * marketer and an HR admin are meant to see different halves of this list, and
 * a tab nobody in the room may open is noise at best.
 */
const MENU_ITEMS: {
	key: string;
	permission: Permission;
	label: ReactNode;
}[] = [
	{
		key: "/admin/users",
		permission: "admin.users.view",
		label: <Link href="/admin/users">Users</Link>,
	},
	{
		key: "/admin/roles",
		permission: "admin.roles.view",
		label: <Link href="/admin/roles">Roles</Link>,
	},
	{
		key: "/admin/posts",
		permission: "admin.posts.view",
		label: <Link href="/admin/posts">Posts</Link>,
	},
	{
		key: "/admin/devlog-posts",
		permission: "admin.devlog_posts.view",
		label: <Link href="/admin/devlog-posts">DevLog Posts</Link>,
	},
	{
		key: "/admin/events",
		permission: "admin.events.view",
		label: <Link href="/admin/events">Events</Link>,
	},
	{
		key: "/admin/workflows",
		permission: "admin.workflow.view",
		label: <Link href="/admin/workflows">Workflows</Link>,
	},
	{
		key: "/admin/audit-logs",
		permission: "admin.audit_logs.view",
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
	const { can } = useAccess();

	const spaceHeader: SpaceHeaderConfig = useMemo(
		() => ({
			menuItems: MENU_ITEMS.filter((item) => can(item.permission)).map(
				({ permission: _permission, ...item }) => item,
			),
			menuSelectedKeys: [resolveSelectedMenuKey(pathname)],
		}),
		[pathname, can],
	);

	useSetSpaceHeader(spaceHeader);

	return <>{children}</>;
};
