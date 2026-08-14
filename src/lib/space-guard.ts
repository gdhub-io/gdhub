import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import type { Permission, SpaceType } from "@/config/spaces";
import {
	apiError,
	type Handler,
	type Locals,
	type SessionUser,
} from "@/lib/api-handlers";
import {
	can,
	getSpaceAccess,
	isEnforcing,
	type MaybeAccessUser,
	type SpaceAccess,
} from "@/services/access";
import {
	logAccessDenied,
	logSuperAdminOverride,
} from "@/services/access/audit";
import { getMatrixHealth } from "@/services/access/matrix-source";

/**
 * Where the space id (or slug) is found on the request.
 *
 * The string form covers the common case. A function is for routes that address
 * a nested entity — a workflow step, a candidate — where the owning space has to
 * be looked up first.
 */
export type SpaceIdSource =
	| `query.${string}`
	| `body.${string}`
	| `params.${string}`
	| ((
			req: NextRequest,
			params: Record<string, string | string[]> | undefined,
	  ) => Promise<string | null> | string | null);

export type SpaceGuardOptions = {
	/** `project.members.invite` — the space type is read from the prefix. */
	permission: Permission;
	/**
	 * Where to read the space id from. Omit for single-instance spaces (hub,
	 * admin, dev).
	 */
	idFrom?: SpaceIdSource;
};

const readId = async (
	req: NextRequest,
	params: Record<string, string | string[]> | undefined,
	from: SpaceIdSource,
): Promise<string | null> => {
	if (typeof from === "function") return from(req, params);

	const [source, key] = from.split(".") as [string, string];

	if (source === "query") {
		return new URL(req.url).searchParams.get(key);
	}

	if (source === "params") {
		const value = params?.[key];
		return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
	}

	const body = (await req
		.clone()
		.json()
		.catch(() => ({}))) as Record<string, unknown>;
	const value = body?.[key];

	return typeof value === "string" ? value : null;
};

const spaceTypeOf = (permission: string): SpaceType =>
	permission.split(".")[0] as SpaceType;

/**
 * Reading is not an event worth an audit row. A super-admin trips the bypass on
 * every guarded GET, which is how `ACCESS_OVERRIDE` grew to 64% of the table —
 * 559 of those 664 rows were plain `.view` permissions.
 */
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Guards a route handler with a permission and injects the resolved access.
 *
 *   export const POST = pipe(
 *     withAuth({ mode: "user" }),
 *     withSpaceGuard({ permission: "project.members.invite", idFrom: "body.projectId" }),
 *     withValidation(Schema),
 *   )(async (_req, _ctx, { user, access, body }) => { … });
 *
 * Responses distinguish the three failures that used to look alike:
 *  - 404 — no role in the space: it must not even be visible;
 *  - 403 — a role, but not this permission;
 *  - 503 — the permission matrix is degraded, so the answer is unknown. Telling
 *    the caller "forbidden" during an outage sends everyone hunting the wrong
 *    problem.
 *
 * See docs/roles-and-permissions.md §6.
 */
export function withSpaceGuard(options: SpaceGuardOptions) {
	const { permission, idFrom } = options;
	const type = spaceTypeOf(permission);

	return function wrap<L extends Locals>(
		handler: Handler<L & { access: SpaceAccess; user: SessionUser }>,
	): Handler<L> {
		return async (req, ctx, locals) => {
			const session = await auth();
			const user = (locals.user ?? session?.user ?? null) as MaybeAccessUser;

			if (!user) return apiError.unauthorized();

			const params = ctx?.params ? await ctx.params : undefined;
			const spaceId = idFrom ? await readId(req, params, idFrom) : null;

			if (idFrom && !spaceId) {
				// Either the request omitted the id, or the nested entity it points
				// at does not exist — both mean "nothing to check access against".
				return typeof idFrom === "function"
					? apiError.notFound()
					: apiError.badRequest(`Missing space id (${idFrom})`);
			}

			const access = await getSpaceAccess(type, spaceId, user);

			if (access.role === "none") return apiError.notFound();

			if (!can(access, permission)) {
				const health = getMatrixHealth();

				if (health.source === "unavailable") {
					return apiError.unavailable(
						"Permissions are temporarily unavailable",
					);
				}

				await logAccessDenied({
					permission,
					access,
					userId: user.id,
					route: new URL(req.url).pathname,
				});

				return apiError.forbidden();
			}

			if (access.viaSuperAdmin && !READ_METHODS.has(req.method)) {
				// Re-resolve without the flag: `getSpaceAccess` sets `viaSuperAdmin`
				// for every request a super-admin makes, so on its own it means
				// "a super-admin was here", not "someone used break-glass".
				const withoutBypass = await getSpaceAccess(type, spaceId, {
					...user,
					isSuperAdmin: false,
				});

				if (!can(withoutBypass, permission)) {
					await logSuperAdminOverride({
						permission,
						access,
						userId: user.id,
						route: new URL(req.url).pathname,
					});
				}
			}

			return handler(req, ctx, { ...locals, user, access } as unknown as L & {
				access: SpaceAccess;
				user: SessionUser;
			});
		};
	};
}

export { isEnforcing };
