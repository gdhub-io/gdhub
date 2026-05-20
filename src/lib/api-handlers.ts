/**
 * App Router Route Handler middleware (higher-order functions).
 *
 * Replaces the `next-api-decorators` stack used in `src/pages/api/**`:
 *   @NextAuthGuard(mode, roles?)  → withAuth({ mode, roles })
 *   @ApiProjectTeamGuard()         → withTeamGuard()
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

import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { type NextRequest, NextResponse } from "next/server";
import type { ZodSchema, z } from "zod";
import { auth } from "@/auth";
import { env } from "@/helpers/env";
import { prisma } from "@/services/prisma";

export type SessionUser = {
	id: string;
	roles: prismaClient.UserRole[];
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
	team?: prismaClient.Team;
	body?: unknown;
	query?: unknown;
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
	internal: (msg = "Internal server error") =>
		NextResponse.json({ error: msg, statusCode: 500 }, { status: 500 }),
};

export type AuthMode =
	| "user"
	| "any"
	| "api"
	| "public_api"
	| "vercel_cron"
	| "gumroad";

export interface AuthOptions {
	mode?: AuthMode;
	roles?: prismaClient.UserRole[];
}

function bearerMatches(req: NextRequest, expected: string) {
	const header = req.headers.get("authorization");
	return header === `Bearer ${expected}`;
}

export function withAuth(opts: AuthOptions = {}) {
	const mode: AuthMode = opts.mode ?? "user";
	const roles = opts.roles;

	return function wrap<L extends Locals>(
		handler: Handler<L & { user: SessionUser }>,
	): Handler<L> {
		return async (req, ctx, locals) => {
			if (mode === "user" || mode === "any") {
				const session = await auth();
				const user = session?.user as SessionUser | undefined;

				if (mode === "any") {
					return handler(req, ctx, {
						...locals,
						user: user ?? (null as unknown as SessionUser),
					} as L & { user: SessionUser });
				}

				if (!user) return apiError.unauthorized();
				if (roles && !roles.some((r) => user.roles.includes(r))) {
					return apiError.unauthorized();
				}

				return handler(req, ctx, { ...locals, user } as L & {
					user: SessionUser;
				});
			}

			if (mode === "api") {
				const token = Buffer.from(env("BACKEND_KEY")).toString("base64");
				if (bearerMatches(req, token)) {
					return handler(req, ctx, locals as L & { user: SessionUser });
				}
			}

			if (mode === "public_api") {
				const token = Buffer.from(env("NEXT_PUBLIC_API_KEY")).toString(
					"base64",
				);
				if (bearerMatches(req, token)) {
					return handler(req, ctx, locals as L & { user: SessionUser });
				}
			}

			if (mode === "vercel_cron") {
				const cronSecret = process.env.CRON_SECRET ?? "";
				const publicToken = Buffer.from(env("NEXT_PUBLIC_API_KEY")).toString(
					"base64",
				);
				if (bearerMatches(req, cronSecret) || bearerMatches(req, publicToken)) {
					return handler(req, ctx, locals as L & { user: SessionUser });
				}
			}

			if (mode === "gumroad") {
				const body = (await req
					.clone()
					.json()
					.catch(() => ({}))) as { access_token?: string };
				if (body?.access_token === env("GUMROAD_ACCESS_TOKEN")) {
					return handler(req, ctx, locals as L & { user: SessionUser });
				}
			}

			return apiError.unauthorized();
		};
	};
}

export function withTeamGuard() {
	return function wrap<L extends Locals>(
		handler: Handler<L & { team: prismaClient.Team; user: SessionUser }>,
	): Handler<L> {
		return async (req, ctx, locals) => {
			const session = await auth();
			const userId = session?.user?.id;

			const url = new URL(req.url);
			let teamId: string | undefined =
				url.searchParams.get("teamId") ?? undefined;

			if (!teamId) {
				const body = (await req
					.clone()
					.json()
					.catch(() => ({}))) as { teamId?: string };
				teamId = body?.teamId;
			}

			if (!userId || !teamId) return apiError.forbidden();

			const team = await prisma.team.findFirst({
				where: {
					id: teamId,
					members: { some: { userId } },
				},
			});
			if (!team) return apiError.forbidden();

			return handler(req, ctx, {
				...locals,
				user: session.user as SessionUser,
				team,
			} as L & { team: prismaClient.Team; user: SessionUser });
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
				raw = Object.fromEntries(url.searchParams.entries());
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
