"use client";

import { IconRestore } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Alert,
	Button,
	Modal,
	message,
	Popconfirm,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
	type PermissionFeature,
	PermissionList,
} from "@/components/admin/PermissionList";
import { ROLE_META } from "@/config/permissions/role-meta";
import { SpaceRole } from "@/config/permissions/roles";
import styles from "./style.module.scss";

const { Text } = Typography;

export type RoleTarget =
	| { kind: "base"; role: SpaceRole }
	| { kind: "custom"; id: string; key: string; title: string };

type Props = {
	space: string;
	target: RoleTarget | null;
	features: PermissionFeature[];
	/** Permissions the role has right now. */
	permissions: string[];
	/** What the registry would generate — the "reset" target for a base role. */
	defaults?: string[];
	onClose: () => void;
};

/**
 * Removing a permission from the `admin` role of the `admin` space is the one
 * edit that can lock every staff member out at once, so it asks twice.
 */
/** Popconfirm has no width of its own; a long description would span the page. */
const CONFIRM_STYLES = { root: { maxWidth: 380 } };

const isSelfLockout = (space: string, target: RoleTarget | null) =>
	space === "admin" &&
	target?.kind === "base" &&
	target.role === SpaceRole.Admin;

export const RolePermissionsModal = ({
	space,
	target,
	features,
	permissions,
	defaults,
	onClose,
}: Props) => {
	const queryClient = useQueryClient();
	const [selected, setSelected] = useState<Set<string>>(new Set(permissions));

	useEffect(() => {
		setSelected(new Set(permissions));
	}, [permissions]);

	const initial = useMemo(() => new Set(permissions), [permissions]);
	const total = features.reduce(
		(sum, feature) => sum + feature.permissions.length,
		0,
	);

	const changes = useMemo(() => {
		const removed = [...initial].filter(
			(permission) => !selected.has(permission),
		);
		const added = [...selected].filter(
			(permission) => !initial.has(permission),
		);

		return { added, removed };
	}, [initial, selected]);

	const changeCount = changes.added.length + changes.removed.length;

	const save = useMutation({
		mutationFn: async () => {
			const next = [...selected];

			if (target?.kind === "custom") {
				await axios.put(`/api/admin/roles/custom/${target.id}`, {
					permissions: next,
				});
				return;
			}

			await axios.put("/api/admin/roles/permissions", {
				space,
				role: target?.kind === "base" ? target.role : undefined,
				permissions: next,
			});
		},
		onSuccess: () => {
			message.success("Permissions saved");
			queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
			onClose();
		},
		onError: (error) => {
			message.error(
				axios.isAxiosError(error)
					? error.response?.data?.error || "Could not save permissions"
					: "Could not save permissions",
			);
		},
	});

	const toggle = (permission: string, checked: boolean) =>
		setSelected((current) => {
			const next = new Set(current);

			if (checked) next.add(permission);
			else next.delete(permission);

			return next;
		});

	const meta = target?.kind === "base" ? ROLE_META[target.role] : null;
	const roleKey =
		target?.kind === "custom" ? target.key : target?.role.toLowerCase();
	const subtitle = meta
		? `${meta.title} · ${meta.hint}`
		: target?.kind === "custom"
			? `${target.title} · custom role in the ${space} space`
			: null;

	/** The save that can lock the whole staff out — it is worded differently. */
	const lockout = isSelfLockout(space, target) && changes.removed.length > 0;

	return (
		<Modal
			open={Boolean(target)}
			onCancel={onClose}
			width={720}
			className={styles.modal}
			title={
				<div className={styles.title}>
					<div className={styles.titleRow}>
						<span className={styles.titleText}>
							Role permissions · {roleKey}
						</span>
						<Tag className={styles.chip}>{space} space</Tag>
					</div>
					{subtitle ? (
						<Text type="secondary" className={styles.subtitle}>
							{subtitle}
						</Text>
					) : null}
				</div>
			}
			footer={
				<>
					<Text type="secondary" className={styles.changes}>
						{changeCount === 0
							? "No changes"
							: `${changeCount} change${changeCount === 1 ? "" : "s"} · written to the AuditLog`}
					</Text>
					<Button onClick={onClose}>Cancel</Button>
					<Popconfirm
						disabled={changeCount === 0}
						styles={CONFIRM_STYLES}
						title={
							lockout
								? "Remove permissions from the admin role?"
								: "Save the permission changes?"
						}
						description={
							lockout
								? `Removing ${changes.removed.join(", ")} in the admin space can lock out every staff member at once — restoring access would take SQL or the super-admin.`
								: `${changes.added.length} added, ${changes.removed.length} removed. The change is written to the AuditLog.`
						}
						okText={lockout ? "Remove anyway" : "Save"}
						okButtonProps={{ danger: lockout }}
						cancelText="Cancel"
						onConfirm={() => save.mutate()}
					>
						<Button
							type="primary"
							loading={save.isPending}
							disabled={changeCount === 0}
						>
							Save
						</Button>
					</Popconfirm>
				</>
			}
		>
			<div className={styles.body}>
				{isSelfLockout(space, target) ? (
					<Alert
						type="warning"
						showIcon
						className={styles.warning}
						title="The admin role in the admin space. Unchecking here locks every staff member out of the admin area — getting back in would take SQL or the super-admin."
					/>
				) : null}

				<div className={styles.section}>
					<div className={styles.sectionHeader}>
						<Text strong className={styles.sectionTitle}>
							Permissions
						</Text>
						<div className={styles.actions}>
							<Text type="secondary" className={styles.counter}>
								{selected.size} of {total} selected
							</Text>
							{defaults ? (
								<Popconfirm
									styles={CONFIRM_STYLES}
									title="Reset to defaults?"
									description="Every tick in this list is replaced by what the permission registry generates for this role. Unsaved changes are lost."
									okText="Reset"
									cancelText="Cancel"
									onConfirm={() => setSelected(new Set(defaults))}
								>
									<Button
										type="link"
										size="small"
										className={styles.reset}
										icon={<IconRestore size={13} />}
									>
										Reset to defaults
									</Button>
								</Popconfirm>
							) : null}
						</div>
					</div>

					<PermissionList
						features={features}
						selected={selected}
						initial={initial}
						onToggle={toggle}
					/>
				</div>
			</div>
		</Modal>
	);
};
