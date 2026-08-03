"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Alert,
	Button,
	Modal,
	message,
	Select,
	Skeleton,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import { type ReactNode, useMemo, useState } from "react";
import { ROLE_META } from "@/config/permissions/role-meta";
import { SPACE_ROLES, SpaceRole } from "@/config/permissions/roles";
import { SPACE_TYPES, type SpaceType } from "@/config/spaces";
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

type SpaceOption = { id: string; title: string };

type Draft = {
	/** Local identity of the draft row; never leaves the component. */
	key: number;
	spaceType: SpaceType | null;
	spaceId: string | null;
	role: SpaceRole;
};

type Props = {
	user: { id: string; name: string; email: string | null } | null;
	onClose: () => void;
};

const HUB = "hub";
const HUB_KEY = `${HUB}:default`;

/** The hub role is the platform role and nobody owns the platform (§2.1). */
const HUB_ROLES = SPACE_ROLES.filter((role) => role !== SpaceRole.Owner);

/** `hub` is edited by the "Hub role" control above, not as a membership row. */
const ASSIGNABLE_SPACE_TYPES = SPACE_TYPES.filter((type) => type !== HUB);

const key = (membership: { spaceType: string; spaceId: string }) =>
	`${membership.spaceType}:${membership.spaceId}`;

const roleOptions = (roles: readonly SpaceRole[] = SPACE_ROLES) =>
	roles.map((role) => ({
		label: role.toLowerCase(),
		value: role,
		title: ROLE_META[role].hint,
	}));

/**
 * Sentinel for "keep the custom role this membership already has". A custom role
 * is not one of the four base roles, so it cannot be picked — only kept.
 */
const CUSTOM = "custom";

const membershipRoleOptions = (customRoleKey: string | null) => [
	...roleOptions().map((option) => ({
		...option,
		label: option.label as ReactNode,
		value: option.value as string,
	})),
	...(customRoleKey
		? [
				{
					value: CUSTOM,
					title: "Role defined in the permission matrix",
					label: (
						<span className={styles.customValue}>
							{customRoleKey}
							<Tag className={styles.customChip}>custom</Tag>
						</span>
					) as ReactNode,
				},
			]
		: []),
];

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
	const [drafts, setDrafts] = useState<Draft[]>([]);

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
	const hubRole = edited.get(HUB_KEY) ?? hub?.role ?? null;
	// The hub has its own section above; this list and its counter are about the
	// spaces the user joined. A row edited down to `null` is a pending removal and
	// leaves the list right away.
	const spaces = memberships.filter(
		(row) =>
			row.spaceType !== HUB &&
			!(edited.has(key(row)) && edited.get(key(row)) === null),
	);

	const changes = useMemo(() => {
		const current = new Map(
			(data?.memberships ?? []).map((row) => [key(row), row]),
		);
		const rows: {
			space: string;
			spaceId: string;
			role: SpaceRole | null;
			customRoleKey?: null;
		}[] = [];

		for (const [id, role] of edited) {
			const was = current.get(id);
			// Picking the role a membership already has is not a change — unless it
			// carried a custom role, which picking a base role drops.
			if (was?.role === role && !was.customRoleKey) continue;

			const [space, spaceId] = id.split(":");

			rows.push({
				space,
				spaceId,
				role,
				...(was?.customRoleKey ? { customRoleKey: null } : {}),
			});
		}

		for (const draft of drafts) {
			if (!draft.spaceType || !draft.spaceId) continue;

			rows.push({
				space: draft.spaceType,
				spaceId: draft.spaceId,
				role: draft.role,
			});
		}

		return rows;
	}, [data?.memberships, edited, drafts]);

	const save = useMutation({
		mutationFn: () =>
			axios.put(`/api/admin/user/${user?.id}/memberships`, { changes }),
		onSuccess: () => {
			message.success("Roles saved");
			queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
			queryClient.invalidateQueries({
				queryKey: ["admin", "user-memberships"],
			});
			setEdited(new Map());
			setDrafts([]);
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

	/** Drops the pending edit of one membership, restoring what the server sent. */
	const revert = (id: string) =>
		setEdited((current) => {
			const next = new Map(current);

			next.delete(id);

			return next;
		});

	/** Spaces the user is already in, or another draft row already points at. */
	const taken = (exceptDraft: number) =>
		new Set([
			...memberships.map(key),
			...drafts
				.filter((draft) => draft.key !== exceptDraft && draft.spaceId)
				.map((draft) => `${draft.spaceType}:${draft.spaceId}`),
		]);

	const updateDraft = (draftKey: number, patch: Partial<Draft>) =>
		setDrafts((current) =>
			current.map((draft) =>
				draft.key === draftKey ? { ...draft, ...patch } : draft,
			),
		);

	return (
		<Modal
			open={Boolean(user)}
			onCancel={onClose}
			width={720}
			className={styles.modal}
			title={
				<div className={styles.title}>
					<Text className={styles.titleText}>User roles</Text>
					<Text type="secondary" className={styles.subtitle}>
						{user?.name} · {user?.email || "—"}
					</Text>
				</div>
			}
			footer={
				<>
					<Button onClick={onClose}>Cancel</Button>
					<Button
						type="primary"
						disabled={changes.length === 0}
						loading={save.isPending}
						onClick={() => save.mutate()}
					>
						Save
					</Button>
				</>
			}
		>
			{isLoading ? (
				<Skeleton active />
			) : (
				<div className={styles.body}>
					<div className={styles.section}>
						<Text strong className={styles.sectionTitle}>
							Hub role
						</Text>
						<Select
							value={hubRole ?? undefined}
							placeholder="No hub membership"
							className={styles.roleSelect}
							options={roleOptions(HUB_ROLES)}
							onChange={(value) => change(HUB_KEY, value)}
						/>
						<Text type="secondary" className={styles.hint}>
							The hub role is the platform role: hub · admin grants admin in
							every other space and access to /admin. hub · guest is the state
							before onboarding.
						</Text>
					</div>

					<div className={styles.section}>
						<div className={styles.sectionHeader}>
							<Text strong className={styles.sectionTitle}>
								Space membership
							</Text>
							<Text type="secondary" className={styles.counter}>
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

						{spaces.length > 0 || drafts.length > 0 ? (
							<div className={styles.list}>
								{spaces.map((membership) => {
									const id = key(membership);
									// An untouched membership with a custom role shows that role;
									// picking a base one replaces it.
									const role = edited.has(id)
										? edited.get(id)
										: membership.customRoleKey
											? CUSTOM
											: membership.role;

									return (
										<div key={id} className={styles.row}>
											<div className={styles.info}>
												<Text className={styles.name} ellipsis>
													{membership.title}
												</Text>
												<Tag className={styles.chip}>
													{membership.spaceType}
												</Tag>
											</div>
											<Select
												value={role ?? undefined}
												disabled={!membership.editable}
												className={styles.roleSelect}
												options={membershipRoleOptions(
													membership.customRoleKey,
												)}
												onChange={(value) =>
													value === CUSTOM
														? revert(id)
														: change(id, value as SpaceRole)
												}
											/>
											<Button
												type="text"
												className={styles.remove}
												disabled={!membership.editable}
												aria-label={`Remove from ${membership.title}`}
												icon={<IconTrash size={16} />}
												onClick={() => change(id, null)}
											/>
										</div>
									);
								})}

								{drafts.map((draft) => (
									<DraftRow
										key={draft.key}
										draft={draft}
										taken={taken(draft.key)}
										onChange={(patch) => updateDraft(draft.key, patch)}
										onRemove={() =>
											setDrafts((current) =>
												current.filter((row) => row.key !== draft.key),
											)
										}
									/>
								))}
							</div>
						) : (
							<Text type="secondary">No other space membership</Text>
						)}

						<Button
							block
							className={styles.add}
							icon={<IconPlus size={14} />}
							onClick={() =>
								setDrafts((current) => [
									...current,
									{
										key: (current.at(-1)?.key ?? 0) + 1,
										spaceType: null,
										spaceId: null,
										role: SpaceRole.Member,
									},
								])
							}
						>
							Add membership
						</Button>
					</div>
				</div>
			)}
		</Modal>
	);
};

type DraftRowProps = {
	draft: Draft;
	/** `type:id` of memberships already on screen — they must not be added twice. */
	taken: Set<string>;
	onChange: (patch: Partial<Draft>) => void;
	onRemove: () => void;
};

/**
 * One pending membership. The space list is fetched per row because it depends
 * on the space type chosen in that row.
 */
const DraftRow = ({ draft, taken, onChange, onRemove }: DraftRowProps) => {
	const [query, setQuery] = useState("");

	const { data: options, isFetching } = useQuery({
		queryKey: ["admin", "spaces", draft.spaceType, query],
		queryFn: () =>
			axios
				.get<SpaceOption[]>("/api/admin/spaces", {
					params: { type: draft.spaceType, query: query || undefined },
				})
				.then((response) => response.data),
		enabled: Boolean(draft.spaceType),
	});

	return (
		<div className={styles.row}>
			<div className={styles.info}>
				<Select
					value={draft.spaceType}
					placeholder="Space type"
					className={styles.typeSelect}
					options={ASSIGNABLE_SPACE_TYPES.map((type) => ({
						label: type,
						value: type,
					}))}
					onChange={(value) => {
						setQuery("");
						onChange({ spaceType: value, spaceId: null });
					}}
				/>
				<Select
					showSearch
					filterOption={false}
					value={draft.spaceId}
					placeholder="Space"
					disabled={!draft.spaceType}
					loading={isFetching}
					className={styles.spaceSelect}
					options={(options ?? []).map((option) => ({
						label: option.title,
						value: option.id,
						disabled: taken.has(`${draft.spaceType}:${option.id}`),
					}))}
					onSearch={setQuery}
					onChange={(value) => onChange({ spaceId: value })}
				/>
			</div>
			<Select
				value={draft.role}
				className={styles.roleSelect}
				options={roleOptions()}
				onChange={(value) => onChange({ role: value })}
			/>
			<Button
				type="text"
				className={styles.remove}
				aria-label="Discard this membership"
				icon={<IconTrash size={16} />}
				onClick={onRemove}
			/>
		</div>
	);
};
