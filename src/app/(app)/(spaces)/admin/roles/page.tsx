"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Button,
	Card,
	message,
	Popconfirm,
	Skeleton,
	Space,
	Tabs,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import { useMemo, useState } from "react";
import { CustomRoleModal } from "@/components/admin/CustomRoleModal";
import type { PermissionFeature } from "@/components/admin/PermissionList";
import {
	RolePermissionsModal,
	type RoleTarget,
} from "@/components/admin/RolePermissionsModal";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { LoadError } from "@/components/ui";
import { ROLE_META } from "@/config/permissions/role-meta";
import type { SpaceRole } from "@/config/permissions/roles";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

type RoleRow = {
	role: SpaceRole;
	permissions: string[];
	defaultPermissions: string[];
	isDefault: boolean;
};

type CustomRoleRow = {
	id: string;
	key: string;
	title: string;
	spaceId: string | null;
	permissions: string[];
};

/** Popconfirm has no width of its own; a long description would span the page. */
const CONFIRM_STYLES = { root: { maxWidth: 380 } };

type RolesResponse = {
	spaceType: string;
	features: PermissionFeature[];
	catalog: string[];
	roles: RoleRow[];
	customRoles: CustomRoleRow[];
	spaces: string[];
};

export default function RolesAdminPage() {
	const queryClient = useQueryClient();
	const [space, setSpace] = useState("hub");
	const [target, setTarget] = useState<RoleTarget | null>(null);
	const [creating, setCreating] = useState(false);

	const { data, isLoading, isLoadingError, refetch } = useQuery({
		queryKey: ["admin", "roles", space],
		queryFn: () =>
			axios
				.get<RolesResponse>("/api/admin/roles", { params: { space } })
				.then((response) => response.data),
	});

	const reset = useMutation({
		mutationFn: () => axios.post("/api/admin/roles/permissions", { space }),
		onSuccess: () => {
			message.success("Permissions restored from the registry");
			queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
		},
		onError: () => message.error("Could not reset the permissions"),
	});

	const remove = useMutation({
		mutationFn: (id: string) => axios.delete(`/api/admin/roles/custom/${id}`),
		onSuccess: () => {
			message.success("Role deleted");
			queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
		},
		onError: () => message.error("Could not delete the role"),
	});

	const total = data?.catalog.length ?? 0;

	/** The permission set the open modal is editing, straight from the query. */
	const open = useMemo(() => {
		if (!target || !data) return { permissions: [], defaults: undefined };

		if (target.kind === "base") {
			const row = data.roles.find(
				(candidate) => candidate.role === target.role,
			);

			return {
				permissions: row?.permissions ?? [],
				defaults: row?.defaultPermissions,
			};
		}

		const row = data.customRoles.find(
			(candidate) => candidate.id === target.id,
		);

		return { permissions: row?.permissions ?? [], defaults: undefined };
	}, [target, data]);

	const roleRow = (
		key: string,
		title: string,
		hint: string,
		count: number,
		onOpen: () => void,
		extra?: React.ReactNode,
	) => (
		<div key={key} className={styles.row}>
			<div className={styles.info}>
				<div className={styles.titleRow}>
					<Text strong>{key}</Text>
					<Text type="secondary">· {title}</Text>
					{extra}
				</div>
				<Text type="secondary" className={styles.hint}>
					{hint}
				</Text>
			</div>
			<div className={styles.count}>
				<Text strong>
					{count} of {total}
				</Text>
				<Text type="secondary" className={styles.hint}>
					permissions
				</Text>
			</div>
			<Button onClick={onOpen}>Permissions</Button>
		</div>
	);

	return (
		<AdminSpace>
			<div className={styles.main}>
				<div className={styles.pageHeader}>
					<div>
						<Title level={2}>Roles &amp; permissions</Title>
						<Text type="secondary">
							Space roles and their permissions. The four base roles always
							exist; custom ones cover narrow jobs — marketer, HR, moderator.
						</Text>
					</div>
					<Popconfirm
						styles={CONFIRM_STYLES}
						title={`Reset every role in the ${space} space?`}
						description="All four base roles go back to what the permission registry generates. Edits made here are lost; custom roles are untouched."
						okText="Reset"
						okButtonProps={{ danger: true }}
						cancelText="Cancel"
						onConfirm={() => reset.mutate()}
					>
						<Button loading={reset.isPending}>Reset to defaults</Button>
					</Popconfirm>
				</div>

				<Tabs
					activeKey={space}
					className={styles.spaceTabs}
					items={(data?.spaces ?? [space]).map((value) => ({
						key: value,
						label: value,
					}))}
					onChange={setSpace}
				/>

				{isLoadingError ? (
					<LoadError onRetry={refetch} />
				) : isLoading || !data ? (
					<Skeleton active />
				) : (
					<Space orientation="vertical" size={16} className={styles.sections}>
						<Card
							title="Base roles"
							extra={
								<Text type="secondary">
									{space} space catalog — {total} permissions
								</Text>
							}
						>
							<Text type="secondary">
								Present in every space, never created or deleted — only the
								permission set is editable
							</Text>
							{data.roles.map((row) =>
								roleRow(
									row.role.toLowerCase(),
									ROLE_META[row.role].title,
									ROLE_META[row.role].hint,
									row.permissions.length,
									() => setTarget({ kind: "base", role: row.role }),
									row.isDefault ? null : <Tag color="orange">edited</Tag>,
								),
							)}
						</Card>

						<Card
							title="Custom roles"
							extra={
								<Button type="primary" onClick={() => setCreating(true)}>
									New role
								</Button>
							}
						>
							<Text type="secondary">
								Narrow roles inside the space. Permissions are limited to the
								selected space catalog
							</Text>
							{data.customRoles.length === 0 ? (
								<div className={styles.empty}>
									<Text type="secondary">
										No custom roles in this space yet
									</Text>
								</div>
							) : (
								data.customRoles.map((row) => (
									<div key={row.id} className={styles.customRow}>
										{roleRow(
											row.key,
											row.title,
											row.permissions.join(", ") || "No permissions",
											row.permissions.length,
											() =>
												setTarget({
													kind: "custom",
													id: row.id,
													key: row.key,
													title: row.title,
												}),
											<Tag>custom</Tag>,
										)}
										<Popconfirm
											styles={CONFIRM_STYLES}
											title={`Delete the role "${row.title}"?`}
											description="Memberships that use this role lose it and are revoked — they will not silently fall back to the broader base role."
											okText="Delete"
											okButtonProps={{ danger: true }}
											cancelText="Cancel"
											onConfirm={() => remove.mutate(row.id)}
										>
											<Button
												danger
												type="text"
												loading={
													remove.isPending && remove.variables === row.id
												}
											>
												Delete
											</Button>
										</Popconfirm>
									</div>
								))
							)}
						</Card>
					</Space>
				)}
			</div>

			<RolePermissionsModal
				space={space}
				target={target}
				features={data?.features ?? []}
				permissions={open.permissions}
				defaults={open.defaults}
				onClose={() => setTarget(null)}
			/>

			<CustomRoleModal
				open={creating}
				space={space}
				features={data?.features ?? []}
				onClose={() => setCreating(false)}
			/>
		</AdminSpace>
	);
}
