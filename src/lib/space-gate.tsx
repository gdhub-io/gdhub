import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AccessProvider } from "@/components/access/AccessProvider";
import type { SpaceType } from "@/config/spaces";
import { type AccessUser, canEnter, getSpaceAccess } from "@/services/access";
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
