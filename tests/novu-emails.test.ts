import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOVU_EMAILS } from "../src/services/novu/emails/templates";

const triggered = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return triggered(path);
		if (!/\.tsx?$/.test(name)) return [];
		return [...readFileSync(path, "utf8").matchAll(/template: "([a-z-]+)"/g)].map(
			(m) => m[1],
		);
	});

// Fields that are links the app builds, not text a user typed.
const URL_FIELDS = /^(appUrl|projectSlug|eventId|acceptUrl|redirectUrl|eventLink|eventUrl|addDevlogPostUrl)$/;

describe("Novu email templates", () => {
	it("cover every workflow the app triggers", () => {
		const missing = [...new Set(triggered("src"))].filter((id) => !NOVU_EMAILS[id]);
		expect(missing).toEqual([]);
	});

	it("never print a user's text unescaped or with its tags", () => {
		for (const [id, steps] of Object.entries(NOVU_EMAILS)) {
			for (const { subject, body } of Object.values(steps)) {
				for (const [, field, filters] of `${subject}\n${body}`.matchAll(
					/\{\{\s*payload\.(\w+)([^}]*)\}\}/g,
				)) {
					if (URL_FIELDS.test(field) || field === "startedAt") continue;
					expect(filters, `${id}: payload.${field}`).toContain("strip_html");
				}
			}
		}
	});
});
