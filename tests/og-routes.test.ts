import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const asNextRequest = (url: string) => new Request(url) as unknown as NextRequest;

/**
 * Smoke tests for all OG image routes. They assert every route renders a valid
 * PNG for a range of titles — crucially including very long titles, which must
 * not break layout or throw. Fonts are served from /public/fonts and remote
 * cover images are fetched, so we stub `fetch` to serve both offline.
 */

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

// A minimal valid 1x1 PNG used as a stand-in for any remote cover image.
const ONE_PX_PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
	"base64",
);

// Host used for stubbed cover/preview images in tests.
const IMG = "https://example.com/cover.png";

function resolveUrl(input: unknown): string {
	if (input instanceof URL) return input.href;
	if (typeof input === "string") return input;
	if (input && typeof input === "object" && "url" in input) {
		return String((input as { url: unknown }).url);
	}
	return String(input);
}

beforeEach(() => {
	const realFetch = globalThis.fetch;
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: unknown, init?: unknown) => {
			const url = resolveUrl(input);
			if (url.endsWith(".ttf")) {
				const file = url.split("/").pop() as string;
				return new Response(readFileSync(path.join(FONTS_DIR, file)));
			}
			if (url.startsWith(IMG)) {
				return new Response(ONE_PX_PNG, {
					headers: { "content-type": "image/png" },
				});
			}
			// Everything else (e.g. next/og's resvg/yoga wasm) goes to real fetch.
			return realFetch(input as RequestInfo, init as RequestInit);
		}),
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

type OgRoute = {
	name: string;
	load: () => Promise<{ GET: (req: NextRequest) => Promise<Response> }>;
	// Builds the query string for a given (already-encoded) title.
	query: (encodedTitle: string) => string;
};

const routes: OgRoute[] = [
	{
		name: "og",
		load: () => import("@/app/api/og/route"),
		query: (t) => `t=${t}&st=${encodeURIComponent("Subtitle")}&img=${encodeURIComponent(IMG)}`,
	},
	{
		name: "og-blog",
		load: () => import("@/app/api/og-blog/route"),
		query: (t) => `t=${t}`,
	},
	{
		name: "og-blog (with cover)",
		load: () => import("@/app/api/og-blog/route"),
		query: (t) => `t=${t}&img=${encodeURIComponent(IMG)}`,
	},
	{
		name: "og-job",
		// `vTerms` is an equity percentage the route re-decodes, so pass a plain
		// numeric value (a literal "%" would make its decodeURIComponent throw).
		load: () => import("@/app/api/og-job/route"),
		query: (t) =>
			`t=${t}&vTerms=5&vDate=2026-01-01&img=${encodeURIComponent(IMG)}`,
	},
	{
		name: "og-event-big",
		load: () => import("@/app/api/og-event-big/route"),
		query: (t) =>
			`t=${t}&st=${encodeURIComponent("Subtitle")}&type=Meetup&date=2026-01-01&img=${encodeURIComponent(IMG)}`,
	},
	{
		name: "og-event-small",
		load: () => import("@/app/api/og-event-small/route"),
		query: (t) =>
			`t=${t}&st=${encodeURIComponent("Subtitle")}&type=Meetup&date=2026-01-01&img=${encodeURIComponent(IMG)}`,
	},
];

const titles: [label: string, title: string][] = [
	["short title", "Hello World"],
	["medium title", "How to build an indie game studio from scratch"],
	[
		"very long title",
		"The Complete and Exhaustive Guide to Building, Shipping and Marketing Your First Indie Game Across Every Platform Imaginable in 2026 and Beyond",
	],
	["extremely long title (word repeat)", "GameDev ".repeat(60).trim()],
	["long unbroken token", "A".repeat(200)],
	// A literal "%" must not break the route's decode (regression for URI malformed).
	["title with percent signs", "Save 50% now — 100% indie games & fun"],
];

describe("OG image routes", () => {
	for (const route of routes) {
		describe(route.name, () => {
			it.each(titles)("renders a PNG for %s", async (_label, title) => {
				const { GET } = await route.load();
				const url = `http://localhost:3000/api/og-test?${route.query(
					encodeURIComponent(title),
				)}`;

				const res = await GET(asNextRequest(url));

				expect(res.status).toBe(200);
				expect(res.headers.get("content-type")).toContain("image/png");

				const buf = await res.arrayBuffer();
				// A real rendered PNG is well over 1KB; a failed render yields tiny/empty output.
				expect(buf.byteLength).toBeGreaterThan(1000);
			});
		});
	}

	it("og-blog renders without a title", async () => {
		const { GET } = await import("@/app/api/og-blog/route");
		const res = await GET(asNextRequest("http://localhost:3000/api/og-blog"));

		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("image/png");
		expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(1000);
	});
});
