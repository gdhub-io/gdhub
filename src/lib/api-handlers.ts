/**
 * App Router Route Handler middleware (higher-order functions).
 *
 * Replaces the `next-api-decorators` stack used in `src/pages/api/**`:
 *   @NextAuthGuard(mode, roles?)  → withAuth({ mode, roles })
 *   @Body(ValidationPipe) Dto      → withValidation(zodSchema, "body")
 *   @Query(ValidationPipe) Dto     → withValidation(zodSchema, "query")
 *
 * Compose right-to-left with `pipe`:
 *
 *   export const POST = pipe(
 *     withAuth(),
 *     withValidation(SomeSchema),
 *   )(async (req, ctx, { user, body }) => { ... });
 */

import { type UserRole, withAuditContext } from "@gdhub-io/gdhub-prisma";
import { type NextRequest, NextResponse } from "next/server";
import type { ZodSchema, z } from "zod";
import { auth } from "@/auth";
import { env } from "@/helpers/env";
import type { SpaceAccess } from "@/services/access/types";

export type SessionUser = {
	id: string;
	roles: UserRole[];
	onboardingDone: boolean;
	lang: string;
	email: string;
	name: string;
	image: string;
	activeSubscription?: string;
	telegramId?: string;
	[key: string]: any;
};

export type Locals = {
	user?: SessionUser;
	body?: unknown;
	query?: unknown;
	/**
	 * Injected by `withSpaceGuard`. Optional here because `pipe` erases the
	 * wrappers' types: a handler that reads it must have the guard above it.
	 */
	access?: SpaceAccess;
};

export type RouteContext<P = Record<string, string | string[]>> = {
	params: Promise<P>;
};

export type Handler<
	L extends Locals = Locals,
	P = Record<string, string | string[]>,
> = (
	req: NextRequest,
	ctx: RouteContext<P>,
	locals: L,
) => Promise<Response> | Response;

export const apiError = {
	unauthorized: (msg = "Unauthorized") =>
		NextResponse.json({ error: msg, statusCode: 401 }, { status: 401 }),
	forbidden: (msg = "Forbidden") =>
		NextResponse.json({ error: msg, statusCode: 403 }, { status: 403 }),
	badRequest: (msg = "Bad request", details?: unknown) =>
		NextResponse.json(
			{ error: msg, statusCode: 400, ...(details ? { details } : {}) },
			{ status: 400 },
		),
	notFound: (msg = "Not found") =>
		NextResponse.json({ error: msg, statusCode: 404 }, { status: 404 }),
	conflict: (msg = "Conflict", details?: unknown) =>
		NextResponse.json(
			{ error: msg, statusCode: 409, ...(details ? { details } : {}) },
			{ status: 409 },
		),
	internal: (msg = "Internal server error") =>
		NextResponse.json({ error: msg, statusCode: 500 }, { status: 500 }),
	/** The answer is unknown right now — a dependency is degraded, not the caller. */
	unavailable: (msg = "Service temporarily unavailable") =>
		NextResponse.json({ error: msg, statusCode: 503 }, { status: 503 }),
};

export type AuthMode = "user" | "any" | "api" | "public_api" | "vercel_cron";

export interface AuthOptions {
	mode?: AuthMode;
}

function bearerMatches(req: NextRequest, expected: string) {
	// An unset secret must never authenticate anyone. Without this, `expected`
	// of "" compares against the literal header `Bearer ` — which any caller can
	// send — so a missing environment variable would read as a guard while
	// letting the whole world through.
	if (!expected) return false;

	const header = req.headers.get("authorization");
	return header === `Bearer ${expected}`;
}

/** A server-to-server call carrying `Bearer base64(BACKEND_KEY)`. */
export const isBackendCall = (req: NextRequest) =>
	bearerMatches(req, Buffer.from(env("BACKEND_KEY", "")).toString("base64"));

/**
 * What `AuditLog.source` says about a write. The auth mode is how the caller
 * proved itself, which is not the same thing — a signed-in web request and an
 * anonymous one both come from the app.
 */
const AUDIT_SOURCE: Record<AuthMode, string> = {
	user: "api",
	any: "api",
	api: "backend",
	public_api: "public_api",
	vercel_cron: "cron",
};

/**
 * Every write the handler performs is attributed to this caller: the audit
 * extension in the Prisma client reads the actor from here. Set at the
 * outermost wrapper so it covers the whole request — space-guarded admin
 * routes alone are not enough; they account for only 9% of audit rows.
 */
function audited<T>(
	req: NextRequest,
	mode: AuthMode,
	userId: string | null,
	run: () => T,
): T {
	return withAuditContext(
		{
			actorUserId: userId,
			source: AUDIT_SOURCE[mode],
			requestId: req.headers.get("x-request-id") ?? undefined,
		},
		run,
	);
}

export function withAuth(opts: AuthOptions = {}) {
	const mode: AuthMode = opts.mode ?? "user";

	return function wrap<L extends Locals>(
		handler: Handler<L & { user: SessionUser }>,
	): Handler<L> {
		return async (req, ctx, locals) => {
			if (mode === "user" || mode === "any") {
				const session = await auth();
				const user = session?.user as SessionUser | undefined;

				if (mode === "any") {
					return audited(req, mode, user?.id ?? null, () =>
						handler(req, ctx, {
							...locals,
							user: user ?? (null as unknown as SessionUser),
						} as L & { user: SessionUser }),
					);
				}

				if (!user) return apiError.unauthorized();

				return audited(req, mode, user.id, () =>
					handler(req, ctx, { ...locals, user } as L & {
						user: SessionUser;
					}),
				);
			}

			if (mode === "api") {
				if (isBackendCall(req)) {
					return audited(req, mode, null, () =>
						handler(req, ctx, locals as L & { user: SessionUser }),
					);
				}
			}

			if (mode === "public_api") {
				const token = Buffer.from(env("NEXT_PUBLIC_API_KEY")).toString(
					"base64",
				);
				if (bearerMatches(req, token)) {
					return audited(req, mode, null, () =>
						handler(req, ctx, locals as L & { user: SessionUser }),
					);
				}
			}

			if (mode === "vercel_cron") {
				// Only the Vercel secret: the public key ships in the client bundle.
				if (bearerMatches(req, process.env.CRON_SECRET ?? "")) {
					return audited(req, mode, null, () =>
						handler(req, ctx, locals as L & { user: SessionUser }),
					);
				}
			}

			return apiError.unauthorized();
		};
	};
}

export type ValidationSource = "body" | "query";

export function withValidation<S extends ZodSchema>(
	schema: S,
	source: ValidationSource = "body",
) {
	return function wrap<L extends Locals>(
		handler: Handler<L & { body: z.infer<S> }>,
	): Handler<L> {
		return async (req, ctx, locals) => {
			let raw: unknown;
			if (source === "body") {
				try {
					raw = await req.clone().json();
				} catch {
					return apiError.badRequest("Invalid JSON body");
				}
			} else {
				const url = new URL(req.url);
				// Collapse to a plain object, but preserve repeated keys
				// (e.g. `?status=a&status=b`) as arrays so array schemas work.
				const params: Record<string, string | string[]> = {};
				for (const key of new Set(url.searchParams.keys())) {
					const values = url.searchParams.getAll(key);
					params[key] = values.length > 1 ? values : values[0];
				}
				raw = params;
			}

			const result = schema.safeParse(raw);
			if (!result.success) {
				return apiError.badRequest("Validation failed", result.error.format());
			}

			return handler(req, ctx, { ...locals, body: result.data } as L & {
				body: z.infer<S>;
			});
		};
	};
}

/** For dev tools: the route does not exist in production at all. */
export const withDevOnly =
	() =>
	(handler: Handler): Handler =>
	(req, ctx, locals) =>
		process.env.NODE_ENV === "production"
			? apiError.notFound()
			: handler(req, ctx, locals);

/**
 * Compose HOF wrappers right-to-left. The first wrapper in the list runs
 * outermost (the very last thing before reaching the inner handler is the
 * last wrapper).
 *
 *   pipe(withAuth(), withValidation(s))(handler)
 *   //  ↳ handler sees { user, body }; withAuth gates first, then withValidation.
 */
export function pipe<H extends Handler<any>>(
	...wrappers: Array<(handler: H) => H>
): (handler: H) => H {
	return (handler: H) => wrappers.reduceRight((h, w) => w(h as H), handler);
}

export function json<T>(data: T, init?: ResponseInit): Response {
	return NextResponse.json(data, init);
}

/**
 * Lets the CDN serve a public, viewer-independent API response for `seconds`.
 * Unlike a route's `revalidate`, it keeps the query out of `next build`.
 */
export const sharedCache = (seconds: number): ResponseInit => ({
	headers: {
		"Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 10}`,
	},
});
