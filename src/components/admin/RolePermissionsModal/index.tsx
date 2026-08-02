"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Modal, message, Tag, Typography } from "antd";
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

	const submit = () => {
		if (isSelfLockout(space, target) && changes.removed.length > 0) {
			Modal.confirm({
				title: `Remove ${changes.removed.join(", ")} from the admin role?`,
				content:
					"This is the admin space. Removing permissions from the admin role can lock out every staff member at once — restoring access would take SQL or the super-admin.",
				okText: "Remove anyway",
				okButtonProps: { danger: true },
				cancelText: "Cancel",
				onOk: () => save.mutate(),
			});
			return;
		}

		save.mutate();
	};

	const toggle = (permission: string, checked: boolean) =>
		setSelected((current) => {
			const next = new Set(current);

			if (checked) next.add(permission);
			else next.delete(permission);

			return next;
		});

	const meta = target?.kind === "base" ? ROLE_META[target.role] : null;
	const title = target?.kind === "custom" ? target.title : meta?.title;

	return (
		<Modal
			open={Boolean(target)}
			onCancel={onClose}
			width={720}
			title={
				<div className={styles.title}>
					<span>Role permissions · {title}</span>
					<Tag>{space} space</Tag>
				</div>
			}
			footer={[
				<Text key="changes" type="secondary" className={styles.changes}>
					{changeCount === 0
						? "No changes"
						: `${changeCount} change${changeCount === 1 ? "" : "s"} · written to the AuditLog`}
				</Text>,
				<Button key="cancel" onClick={onClose}>
					Cancel
				</Button>,
				<Button
					key="save"
					type="primary"
					loading={save.isPending}
					disabled={changeCount === 0}
					onClick={submit}
				>
					Save
				</Button>,
			]}
		>
			<div className={styles.body}>
				{meta ? <Text type="secondary">{meta.hint}</Text> : null}

				{isSelfLockout(space, target) ? (
					<Alert
						type="warning"
						showIcon
						title="The admin role in the admin space. Unchecking here locks every staff member out of the admin area — getting back in would take SQL or the super-admin."
					/>
				) : null}

				<div className={styles.sectionHeader}>
					<Text strong>Permissions</Text>
					<div className={styles.actions}>
						<Text type="secondary">
							{selected.size} of {total} selected
						</Text>
						{defaults ? (
							<Button
								type="link"
								size="small"
								onClick={() => setSelected(new Set(defaults))}
							>
								Reset to defaults
							</Button>
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
		</Modal>
	);
};
