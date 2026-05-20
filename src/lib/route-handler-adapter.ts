/**
 * FALLBACK adapter: wraps a `next-api-decorators` `createHandler(...)` result
 * (a `NextApiHandler`) as a Next.js App Router Route Handler.
 *
 * NOT the default migration path. The default is to rewrite each API route as
 * a native Route Handler with HOF middleware (see src/lib/api-handlers.ts in
 * Этап 4.1). Use this adapter only for routes that cannot be rewritten quickly
 * — e.g. a sprawling catch-all that does not split cleanly on the first pass.
 *
 * Constraint: next-api-decorators derives the handler base path from a stack
 * trace looking for "/pages/api/" (see internals/getCallerInfo.js). To use
 * this adapter, the wrapped legacy handler file must live under a path that
 * contains "/pages/api/" so getCallerInfo still resolves correctly. In
 * practice that means parking the file at e.g. src/pages/api/_legacy/* until
 * it is fully rewritten.
 *
 * Limitations: does NOT support streaming / formData request bodies, SSE
 * responses, or next-api-decorators @Middleware chains that mutate res early.
 * Convert such routes to native Route Handlers instead.
 */

import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { type NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<Record<string, string | string[]>> };

type CapturedResponse = {
	statusCode: number;
	headers: Record<string, string | string[]>;
	body: BodyInit | null;
	ended: boolean;
};

function buildMockReq(
	request: NextRequest,
	pathOverride: string,
	parsedBody: unknown,
	pathParams: Record<string, string | string[]>,
): NextApiRequest {
	const url = new URL(request.url);
	const query: Record<string, string | string[]> = { ...pathParams };
	url.searchParams.forEach((value, key) => {
		if (key in query) {
			const existing = query[key];
			query[key] = Array.isArray(existing)
				? [...existing, value]
				: [existing as string, value];
		} else {
			query[key] = value;
		}
	});

	const cookies: Record<string, string> = {};
	for (const c of request.cookies.getAll()) cookies[c.name] = c.value;

	const headers: Record<string, string> = {};
	request.headers.forEach((v, k) => {
		headers[k] = v;
	});

	return {
		url: pathOverride + url.search,
		method: request.method,
		query,
		body: parsedBody,
		headers,
		cookies,
		env: process.env,
	} as unknown as NextApiRequest;
}

function buildMockRes(captured: CapturedResponse): NextApiResponse {
	const res = {
		statusCode: 200,
		status(code: number) {
			captured.statusCode = code;
			res.statusCode = code;
			return res;
		},
		setHeader(name: string, value: string | string[]) {
			captured.headers[name.toLowerCase()] = value;
			return res;
		},
		getHeader(name: string) {
			return captured.headers[name.toLowerCase()];
		},
		removeHeader(name: string) {
			delete captured.headers[name.toLowerCase()];
		},
		json(payload: unknown) {
			captured.headers["content-type"] = "application/json";
			captured.body = JSON.stringify(payload);
			captured.ended = true;
			return res;
		},
		send(payload: unknown) {
			if (typeof payload === "string" || payload instanceof Uint8Array) {
				captured.body = payload as BodyInit;
			} else if (payload !== undefined && payload !== null) {
				captured.headers["content-type"] =
					captured.headers["content-type"] ?? "application/json";
				captured.body = JSON.stringify(payload);
			}
			captured.ended = true;
			return res;
		},
		end(payload?: unknown) {
			if (payload !== undefined) res.send(payload);
			captured.ended = true;
			return res;
		},
		redirect(...args: unknown[]) {
			// Pages API supports (url) or (status, url)
			let status = 307;
			let location: string;
			if (typeof args[0] === "number") {
				status = args[0];
				location = String(args[1]);
			} else {
				location = String(args[0]);
			}
			captured.statusCode = status;
			captured.headers.location = location;
			captured.ended = true;
			return res;
		},
		write(_chunk: unknown) {
			// Streaming not supported via this adapter.
			throw new Error(
				"route-handler-adapter: streaming responses are not supported. Convert the route to a native Route Handler.",
			);
		},
	};
	return res as unknown as NextApiResponse;
}

async function parseBody(request: NextRequest): Promise<unknown> {
	if (request.method === "GET" || request.method === "HEAD") return undefined;

	const contentType = request.headers.get("content-type") ?? "";

	if (contentType.includes("application/json")) {
		try {
			return await request.json();
		} catch {
			return undefined;
		}
	}

	if (contentType.includes("application/x-www-form-urlencoded")) {
		const text = await request.text();
		return Object.fromEntries(new URLSearchParams(text));
	}

	// multipart/form-data and others: caller should use a native Route Handler.
	// We pass undefined and trust the inner handler to read req.body lazily.
	return undefined;
}

/**
 * Wrap a `next-api-decorators` handler (or any classic `NextApiHandler`) as
 * App Router Route Handler exports.
 *
 * `pathOverride` is the legacy `/api/...` URL the inner handler expects to see
 * — needed because `next-api-decorators` re-parses `req.url` to dispatch its
 * internal route table.
 *
 * @example
 *   // src/app/api/courses/route.ts
 *   import legacy from "@/pages/api/_legacy/courses";
 *   import { toRouteHandler } from "@/lib/route-handler-adapter";
 *   export const { GET } = toRouteHandler(legacy, "/api/courses");
 */
export function toRouteHandler(legacy: NextApiHandler, pathOverride: string) {
	const adapt =
		(method: string) =>
		async (request: NextRequest, ctx?: RouteContext): Promise<Response> => {
			const params = (await ctx?.params) ?? {};
			const parsedBody = await parseBody(request);
			const captured: CapturedResponse = {
				statusCode: 200,
				headers: {},
				body: null,
				ended: false,
			};
			const req = buildMockReq(request, pathOverride, parsedBody, params);
			(req as NextApiRequest).method = method;
			const res = buildMockRes(captured);

			// Unhandled errors propagate to App Router's standard error UI.
			// Wrap in Promise.resolve so both sync and async handlers settle.
			await Promise.resolve(legacy(req, res));

			const headers = new Headers();
			for (const [k, v] of Object.entries(captured.headers)) {
				if (Array.isArray(v)) for (const item of v) headers.append(k, item);
				else if (v != null) headers.set(k, v);
			}

			return new NextResponse(captured.body, {
				status: captured.statusCode,
				headers,
			});
		};

	return {
		GET: adapt("GET"),
		POST: adapt("POST"),
		PUT: adapt("PUT"),
		PATCH: adapt("PATCH"),
		DELETE: adapt("DELETE"),
		HEAD: adapt("HEAD"),
		OPTIONS: adapt("OPTIONS"),
	};
}
