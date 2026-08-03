"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Alert,
	Button,
	Modal,
	message,
	Segmented,
	Select,
	Skeleton,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import { useState } from "react";
import { ROLE_META } from "@/config/permissions/role-meta";
import { SPACE_ROLES, type SpaceRole } from "@/config/permissions/roles";
import styles from "./style.module.scss";

const { Text } = Typography;

type Membership = {
	spaceType: string;
	spaceId: string;
	role: SpaceRole;
	customRoleKey: string | null;
	title: string;
	editable: boolean;
};

type Response = { memberships: Membership[]; canEditAnySpace: boolean };

type Props = {
	user: { id: string; name: string; email: string | null } | null;
	onClose: () => void;
};

const HUB = "hub";

const key = (membership: Membership) =>
	`${membership.spaceType}:${membership.spaceId}`;

/**
 * Roles of one user across every space they belong to.
 *
 * `isSuperAdmin` is deliberately absent: it is the break-glass identity and is
 * set by hand in the database, never through a screen that can be reached with a
 * stolen session (docs/roles-and-permissions.md §2.1).
 */
export const UserRolesModal = ({ user, onClose }: Props) => {
	const queryClient = useQueryClient();
	const [edited, setEdited] = useState<Map<string, SpaceRole | null>>(
		new Map(),
	);

	const { data, isLoading } = useQuery({
		queryKey: ["admin", "user-memberships", user?.id],
		queryFn: () =>
			axios
				.get<Response>(`/api/admin/user/${user?.id}/memberships`)
				.then((response) => response.data),
		enabled: Boolean(user),
	});

	const memberships = data?.memberships ?? [];
	const hub = memberships.find((row) => row.spaceType === HUB);
	const hubRole = edited.get(`${HUB}:default`) ?? hub?.role ?? null;
	// The hub has its own section above; this list and its counter are about the
	// spaces the user joined.
	const spaces = memberships.filter((row) => row.spaceType !== HUB);

	const save = useMutation({
		mutationFn: async () => {
			const changes = [...edited.entries()].map(([id, role]) => {
				const [space, spaceId] = id.split(":");

				return { space, spaceId, role };
			});

			await axios.put(`/api/admin/user/${user?.id}/memberships`, { changes });
		},
		onSuccess: () => {
			message.success("Roles saved");
			queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
			queryClient.invalidateQueries({
				queryKey: ["admin", "user-memberships"],
			});
			setEdited(new Map());
			onClose();
		},
		onError: (error) => {
			message.error(
				axios.isAxiosError(error)
					? error.response?.data?.error || "Could not save the roles"
					: "Could not save the roles",
			);
		},
	});

	const change = (id: string, role: SpaceRole | null) =>
		setEdited((current) => new Map(current).set(id, role));

	return (
		<Modal
			open={Boolean(user)}
			onCancel={onClose}
			width={640}
			title="User roles"
			okText="Save"
			okButtonProps={{ disabled: edited.size === 0, loading: save.isPending }}
			onOk={() => save.mutate()}
		>
			<div className={styles.body}>
				<Text type="secondary">
					{user?.name} · {user?.email || "—"}
				</Text>

				{isLoading ? (
					<Skeleton active />
				) : (
					<>
						<div className={styles.section}>
							<Text strong>Hub role</Text>
							<Segmented
								value={hubRole ?? undefined}
								options={SPACE_ROLES.map((role) => ({
									label: ROLE_META[role].title,
									value: role,
								}))}
								onChange={(value) =>
									change(`${HUB}:default`, value as SpaceRole)
								}
							/>
							<Text type="secondary" className={styles.hint}>
								The hub role is the platform role: hub · admin grants admin in
								every other space and access to /admin. hub · guest is the state
								before onboarding.
							</Text>
						</div>

						<div className={styles.section}>
							<div className={styles.sectionHeader}>
								<Text strong>Space membership</Text>
								<Text type="secondary">
									{spaces.length} space{spaces.length === 1 ? "" : "s"}
								</Text>
							</div>

							{data && !data.canEditAnySpace ? (
								<Alert
									type="info"
									showIcon
									title="Project, event and course membership is read-only here — administering the platform is not the same as joining someone's space. Only the super-admin changes those."
								/>
							) : null}

							{spaces.map((membership) => {
								const id = key(membership);
								const role = edited.has(id) ? edited.get(id) : membership.role;

								return (
									<div key={id} className={styles.row}>
										<div className={styles.info}>
											<Text>{membership.title}</Text>
											<Tag>{membership.spaceType}</Tag>
											{membership.customRoleKey ? (
												<Tag color="blue">{membership.customRoleKey}</Tag>
											) : null}
										</div>
										<Select
											value={role ?? "removed"}
											disabled={!membership.editable}
											className={styles.select}
											onChange={(value) =>
												change(
													id,
													value === "removed" ? null : (value as SpaceRole),
												)
											}
											options={[
												...SPACE_ROLES.map((candidate) => ({
													label: candidate.toLowerCase(),
													value: candidate,
												})),
												{ label: "remove", value: "removed" },
											]}
										/>
									</div>
								);
							})}

							{spaces.length === 0 ? (
								<Text type="secondary">No other space membership</Text>
							) : null}
						</div>
					</>
				)}
			</div>
		</Modal>
	);
};
