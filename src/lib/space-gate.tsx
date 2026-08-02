import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AccessProvider } from "@/components/access/AccessProvider";
import type { Permission, SpaceType } from "@/config/spaces";
import {
	type AccessUser,
	can,
	canEnter,
	getSpaceAccess,
} from "@/services/access";
import { toSnapshot } from "@/services/access/snapshot";

type GateProps = {
	children: ReactNode;
	params?: Promise<Record<string, string | string[]>>;
};

/**
 * Server-side gate for a space: resolves the caller's role and 404s when there
 * is none. Entering a space is decided by the role, never by a permission —
 * permissions guard what is inside (docs/roles-and-permissions.md §3.1).
 *
 * Usage, one line per space:
 *
 *   // app/(app)/(spaces)/user/project/[slug]/layout.tsx
 *   export default createSpaceGate("project", { param: "slug" });
 *
 * `param` names the route segment carrying the entity slug or id; omit it for
 * single-instance spaces (hub, admin, dev).
 *
 * The resolved access is published to the client through AccessProvider, so the
 * pages below can hide what the user may not do without resolving anything
 * themselves.
 */
export function createSpaceGate(
	type: SpaceType,
	options: { param?: string } = {},
) {
	return async function SpaceGate({ children, params }: GateProps) {
		const routeParams = params ? await params : undefined;
		const raw = options.param ? routeParams?.[options.param] : undefined;
		const param = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);

		const session = await auth();
		const access = await getSpaceAccess(
			type,
			param,
			(session?.user ?? null) as AccessUser,
		);

		if (!canEnter(access)) notFound();

		return (
			<AccessProvider value={{ [type]: toSnapshot(access) }}>
				{children}
			</AccessProvider>
		);
	};
}

/**
 * Gate for one page inside a space the caller can already enter: 404s unless
 * they hold the permission.
 *
 * This is the server-side counterpart of `withSpaceGuard`. It exists because the
 * proxy cannot do this job — middleware runs on the edge, where there is no
 * database and therefore no matrix to consult, so the checks that used to live
 * there could only ever look at the session's role list.
 *
 * A missing permission is a 404, not a 403, for the same reason as in the space
 * gate: a page nobody may open should not confirm that it exists.
 */
export function createPermissionGate(
	permission: Permission,
	options: { param?: string } = {},
) {
	const type = permission.split(".")[0] as SpaceType;

	return async function PermissionGate({ children, params }: GateProps) {
		const routeParams = params ? await params : undefined;
		const raw = options.param ? routeParams?.[options.param] : undefined;
		const param = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);

		const session = await auth();
		const access = await getSpaceAccess(
			type,
			param,
			(session?.user ?? null) as AccessUser,
		);

		if (!canEnter(access) || !can(access, permission)) notFound();

		return (
			<AccessProvider value={{ [type]: toSnapshot(access) }}>
				{children}
			</AccessProvider>
		);
	};
}
