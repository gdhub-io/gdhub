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
