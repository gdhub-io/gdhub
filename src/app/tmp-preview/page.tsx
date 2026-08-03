"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { RolePermissionsModal } from "@/components/admin/RolePermissionsModal";
import { SpaceRole } from "@/config/permissions/roles";
import { appThemeConfig } from "@/config/theme";

const features = [
	{
		feature: "users",
		permissions: [
			{ permission: "admin.users.view", action: "view" },
			{ permission: "admin.users.manage", action: "manage" },
		],
	},
	{
		feature: "posts",
		permissions: [
			{ permission: "admin.posts.view", action: "view" },
			{ permission: "admin.posts.manage", action: "manage" },
		],
	},
	{
		feature: "devlog_posts",
		permissions: [
			{ permission: "admin.devlog_posts.view", action: "view" },
			{ permission: "admin.devlog_posts.manage", action: "manage" },
		],
	},
	{
		feature: "workflow",
		permissions: [
			{ permission: "admin.workflow.view", action: "view" },
			{ permission: "admin.workflow.manage", action: "manage" },
		],
	},
	{
		feature: "audit_logs",
		permissions: [{ permission: "admin.audit_logs.view", action: "view" }],
	},
];

const permissions = features.flatMap((feature) =>
	feature.permissions.map((row) => row.permission),
);

const client = new QueryClient();

export default function TmpPreview() {
	return (
		<QueryClientProvider client={client}>
			<ConfigProvider theme={appThemeConfig}>
				<RolePermissionsModal
					space="admin"
					target={{ kind: "base", role: SpaceRole.Admin }}
					features={features}
					permissions={permissions}
					defaults={permissions}
					onClose={() => {}}
				/>
			</ConfigProvider>
		</QueryClientProvider>
	);
}
