import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import type { MenuProps } from "antd";
import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";

interface AdminLayoutProps {
	children: ReactNode;
}

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

export const AdminLayout = ({ children }: AdminLayoutProps) => {
	const router = useRouter();

	const menuItems: MenuProps["items"] = useMemo(
		() => [
			{
				key: "/admin/users",
				label: <Link href="/admin/users">Users</Link>,
			},
			{
				key: "/admin/posts",
				label: <Link href="/admin/posts">Posts</Link>,
			},
			{
				key: "/admin/devlog-posts",
				label: <Link href="/admin/devlog-posts">DevLog Posts</Link>,
			},
			{
				key: "/admin/workflows",
				label: <Link href="/admin/workflows">Workflows</Link>,
			},
			{
				key: "/admin/agreements",
				label: <Link href="/admin/agreements">Agreements</Link>,
			},
			{
				key: "/admin/audit-logs",
				label: <Link href="/admin/audit-logs">Audit logs</Link>,
			},
		],
		[],
	);

	const selectedMenuKey = resolveSelectedMenuKey(router.pathname);

	return (
		<ProtectedLayout
			access={[prismaClient.UserRole.Admin]}
			topMenuItems={menuItems}
			topMenuSelectedKeys={[selectedMenuKey]}
		>
			{children}
		</ProtectedLayout>
	);
};
