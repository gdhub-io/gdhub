import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const EVENT_API = "src/app/api/user/event";

/**
 * Routes that legitimately carry no space guard, each with the reason. Anything
 * else under the event API must state which permission it needs.
 *
 * The audit that produced this test found seven routes with no ownership check
 * at all: any signed-in user could publish, archive or restore someone else's
 * event by id, and edit its programme. `withAuth` alone answers "is this a
 * user", never "is this their event".
 */
const UNGUARDED_BY_DESIGN: Record<string, string> = {
	"route.ts": "creation — there is no event yet; guarded by hub.events.create",
	"count/route.ts": "counts the caller's own events, filtered by createdById",
	"[id]/register/route.ts":
		"joining is open to anyone on a published event — that is the point",
};

function routeFiles(dir: string, prefix = ""): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = join(dir, entry);
		const rel = prefix ? `${prefix}/${entry}` : entry;

		if (statSync(full).isDirectory()) return routeFiles(full, rel);
		return entry === "route.ts" ? [rel] : [];
	});
}

describe("event API — every route states what it lets you do", () => {
	const routes = routeFiles(EVENT_API);

	it("finds the event routes at all (a moved folder must not pass silently)", () => {
		expect(routes.length).toBeGreaterThan(20);
	});

	it.each(routes)("%s is guarded", (route) => {
		const source = readFileSync(join(EVENT_API, route), "utf8");
		const exempt = route in UNGUARDED_BY_DESIGN;

		// The call, not the identifier: an unused import satisfies a substring
		// check and would let a route that lost its guard pass as guarded.
		const guarded = /withSpaceGuard\(\{[\s\S]*?permission:\s*"[^"]+"/.test(
			source,
		);

		expect(guarded || exempt, exempt ? "" : `${route} has no withSpaceGuard`).toBe(
			true,
		);
	});

	it("keeps the exemption list honest — no stale entries", () => {
		for (const route of Object.keys(UNGUARDED_BY_DESIGN)) {
			expect(routes).toContain(route);
		}
	});

	it("guards the lifecycle routes with the lifecycle permissions", () => {
		const read = (route: string) =>
			readFileSync(join(EVENT_API, route), "utf8");

		expect(read("[id]/publish/route.ts")).toContain("event.lifecycle.publish");
		expect(read("[id]/unpublish/route.ts")).toContain("event.lifecycle.publish");
		expect(read("[id]/archive/route.ts")).toContain("event.lifecycle.archive");
		expect(read("[id]/restore/route.ts")).toContain("event.lifecycle.archive");
		expect(read("[id]/schedule/route.ts")).toContain("event.schedule.edit");
		expect(read("[id]/schedule/[scheduleItemId]/route.ts")).toContain(
			"event.schedule.edit",
		);
	});
});

describe("event links point at a route that exists", () => {
	// `/event/[slug]` is the only public event route: there is no middleware, no
	// `[locale]` segment and no rewrite, so every `/en/event/…` or `/event/en/…`
	// link the app built was a guaranteed 404.
	const LINKING_FILES = [
		"src/app/(app)/(spaces)/user/events/MyEventsClient.tsx",
		"src/components/LatestEvents/index.tsx",
		"src/components/spaces/EventSpace/index.tsx",
		"src/components/events/BannerEventSlider.tsx",
		"src/components/events/EventCard.tsx",
	];

	it.each(LINKING_FILES)("%s builds no locale segment", (file) => {
		const source = readFileSync(file, "utf8");

		// A locale either in front of `/event` or between it and the slug.
		expect(source).not.toMatch(/lang[^\n]*\}\s*\/?`?\s*\/event\//);
		expect(source).not.toMatch(/\/event\/\$\{[^}]*lang/);
	});

	it("keeps the public event route locale-free", () => {
		const routes = readdirSync("src/app/(public)");

		expect(routes).toContain("event");
		expect(routes).not.toContain("[locale]");
		expect(routes).not.toContain("[lang]");
	});
});

describe("admin event routes", () => {
	const ADMIN_ROUTES = [
		["src/app/api/admin/events/route.ts", "admin.events.view"],
		["src/app/api/admin/event/[id]/route.ts", "admin.events.manage"],
	] as const;

	it.each(ADMIN_ROUTES)("%s is guarded by %s", (route, permission) => {
		expect(readFileSync(route, "utf8")).toContain(permission);
	});

	it("lets staff preview an announcement but only manage may send it", () => {
		const source = readFileSync(
			"src/app/api/admin/event/[id]/announce/route.ts",
			"utf8",
		);

		// The GET is a preview and reads; the POST publishes to the outside world.
		const [, get, post] = source.split(/export const (?:GET|POST) = pipe\(/);
		expect(get).toContain("admin.events.view");
		expect(post).toContain("admin.events.manage");
	});

	it("refuses to announce anything that is not on the public web", () => {
		const source = readFileSync(
			"src/app/api/admin/event/[id]/announce/route.ts",
			"utf8",
		);

		// Both verbs check it: a preview of a draft would show a message linking
		// to a 404, and sending one would publish that link.
		expect(source.match(/EventStatus\.Published \|\| !event\.slug/g)).toHaveLength(
			2,
		);
	});
});

describe("event listings — a draft belongs to its organiser", () => {
	it("never lets a caller-supplied status reach past the published catalogue", () => {
		for (const file of ["src/app/api/events/route.ts", "src/app/api/events-count/route.ts"]) {
			const source = readFileSync(file, "utf8");

			// The filter is intersected with what the hub may show, rather than
			// handed to Prisma as the caller wrote it.
			expect(source).toContain("LISTABLE");
			expect(source).toMatch(/requested\.filter/);
			expect(source).not.toMatch(/status: status\s*\?/);
		}
	});

	it("keeps the public event page to published events", () => {
		const source = readFileSync("src/app/(public)/event/[slug]/page.tsx", "utf8");

		expect(source).toContain("PUBLIC_STATUSES");
		expect(source).toMatch(/status: \{ in: PUBLIC_STATUSES \}/);
	});
});
