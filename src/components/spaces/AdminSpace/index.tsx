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
	if (pathname.startsWith("/admin/views")) return "/admin/views";
	if (pathname.startsWith("/admin/devlog-posts")) return "/admin/devlog-posts";
	if (pathname.startsWith("/admin/events")) return "/admin/events";
	if (pathname.startsWith("/admin/scouts")) return "/admin/scouts";
	if (pathname.startsWith("/admin/posts")) return "/admin/posts";
	if (pathname.startsWith("/admin/workflows")) return "/admin/workflows";
	if (pathname.startsWith("/admin/checkpoints")) return "/admin/checkpoints";
	return "/admin/users";
};

/**
 * Every section with the permission that opens it. Staff is not one role — a
 * marketer and an HR admin are meant to see different halves of this list, and
 * a tab nobody in the room may open is noise at best.
 */
/**
 * The admin sections, named once.
 *
 * The name is the data and the link is derived from it: the trail needs the
 * plain word for the current crumb, and reading it back out of a rendered
 * `<Link>` would be parsing our own markup.
 */
const MENU_ITEMS: {
	key: string;
	permission: Permission;
	name: string;
}[] = [
	{ key: "/admin/users", permission: "admin.users.view", name: "Users" },
	{ key: "/admin/roles", permission: "admin.roles.view", name: "Roles" },
	{ key: "/admin/posts", permission: "admin.posts.view", name: "Posts" },
	{
		key: "/admin/devlog-posts",
		permission: "admin.devlog_posts.view",
		name: "DevLog Posts",
	},
	{ key: "/admin/events", permission: "admin.events.view", name: "Events" },
	{ key: "/admin/scouts", permission: "admin.scouts.view", name: "Scouts" },
	{
		key: "/admin/workflows",
		permission: "admin.workflow.view",
		name: "Workflows",
	},
	{
		key: "/admin/audit-logs",
		permission: "admin.audit_logs.view",
		name: "Audit logs",
	},
	{ key: "/admin/views", permission: "admin.views.view", name: "Views" },
	{
		key: "/admin/checkpoints",
		permission: "admin.checkpoints.view",
		name: "Checkpoints",
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

	const spaceHeader: SpaceHeaderConfig = useMemo(() => {
		const selectedKey = resolveSelectedMenuKey(pathname);
		const section = MENU_ITEMS.find((item) => item.key === selectedKey);

		return {
			// Admin has a trail but no `space`: it belongs to the platform rather
			// than to the person, so the switcher does not list it.
			trail: {
				parent: { href: "/admin/users", label: "Admin" },
				current: { label: section?.name ?? "Admin" },
			},
			menuItems: MENU_ITEMS.filter((item) => can(item.permission)).map(
				({ key, name }) => ({ key, label: <Link href={key}>{name}</Link> }),
			),
			menuSelectedKeys: [selectedKey],
		};
	}, [pathname, can]);

	useSetSpaceHeader(spaceHeader);

	return <>{children}</>;
};
