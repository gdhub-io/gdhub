import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRON_API = "src/app/api/cron";
const VERCEL_CONFIG = "vercel.json";

function routeFiles(dir: string, prefix = ""): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = join(dir, entry);
		const rel = prefix ? `${prefix}/${entry}` : entry;

		if (statSync(full).isDirectory()) return routeFiles(full, rel);
		return entry === "route.ts" ? [rel] : [];
	});
}

describe("cron routes are not open to the world", () => {
	const routes = routeFiles(CRON_API);

	it("finds the cron routes at all", () => {
		expect(routes.length).toBeGreaterThan(4);
	});

	// These endpoints write: they archive events, send notifications and queue
	// matching jobs. Every one of them was a bare `export async function GET()`
	// that anyone could call.
	it.each(routes)("%s requires the cron bearer", (route) => {
		const source = readFileSync(join(CRON_API, route), "utf8");

		expect(source).toMatch(/withAuth\(\{\s*mode:\s*"vercel_cron"\s*\}\)/);
	});

	it("schedules only paths that exist", () => {
		const config = JSON.parse(readFileSync(VERCEL_CONFIG, "utf8"));
		const paths: string[] = config.crons.map(
			(entry: { path: string }) => entry.path,
		);

		for (const path of paths) {
			const route = `${path.replace("/api/cron/", "")}/route.ts`;
			expect(routes, `${path} has no route file`).toContain(route);
		}
	});
});

describe("an unset secret authenticates nobody", () => {
	it("rejects the empty bearer rather than matching `Bearer `", () => {
		const source = readFileSync("src/lib/api-handlers.ts", "utf8");

		// `Bearer ${""}` is a string any caller can send, so comparing against it
		// turns a missing environment variable into an open door.
		expect(source).toMatch(/function bearerMatches[\s\S]{0,400}if \(!expected\) return false;/);
	});
});
