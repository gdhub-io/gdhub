"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { SpaceRole } from "@/config/permissions/roles";
import type { Permission, SpaceType } from "@/config/spaces";
import type { SpaceAccessSnapshot } from "@/services/access/snapshot";

type AccessMap = Partial<Record<SpaceType, SpaceAccessSnapshot>>;

const AccessContext = createContext<AccessMap>({});

/**
 * Publishes what the current user may do, resolved on the server.
 *
 * Providers nest and merge: the app layout supplies the hub and admin spaces,
 * a space gate adds its own. So a page inside a project sees both `hub.*` and
 * `project.*` without anyone passing props around.
 *
 * The client copy is for rendering only — hiding a button no one may press.
 * Every mutation is checked again on the server (docs/roles-and-permissions.md §6).
 */
export function AccessProvider({
	value,
	children,
}: {
	value: AccessMap;
	children: ReactNode;
}) {
	const parent = useContext(AccessContext);
	const merged = useMemo(() => ({ ...parent, ...value }), [parent, value]);

	return (
		<AccessContext.Provider value={merged}>{children}</AccessContext.Provider>
	);
}

export type AccessApi = {
	/** `can("project.info.edit")` — the space is read from the prefix. */
	can: (permission: Permission) => boolean;
	/** `"own"` when the permission only covers the user's own records. */
	scopeOf: (permission: Permission) => "own" | null;
	/** Role in a space, or `"none"` when the user has none. */
	roleIn: (space: SpaceType) => SpaceRole | "none";
	/** True when the user may enter the space at all. */
	isIn: (space: SpaceType) => boolean;
};

export function useAccess(): AccessApi {
	const accesses = useContext(AccessContext);

	return useMemo(() => {
		const snapshotFor = (permission: string) =>
			accesses[permission.split(".")[0] as SpaceType];

		return {
			can: (permission) =>
				snapshotFor(permission)?.permissions.includes(permission) ?? false,
			scopeOf: (permission) =>
				snapshotFor(permission)?.scopes[permission] ?? null,
			roleIn: (space) => accesses[space]?.role ?? "none",
			isIn: (space) => (accesses[space]?.role ?? "none") !== "none",
		};
	}, [accesses]);
}
