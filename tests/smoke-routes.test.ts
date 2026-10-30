import { describe, expect, it } from "vitest";
import { addressOf, allRoutes } from "./e2e/smoke/routes";

// GDHUB-130: a wrong rule here makes the smoke stage check the wrong people, silently.
describe("the smoke stage's routes", () => {
	const routes = allRoutes();
	const route = (path: string) => {
		const found = routes.find((row) => row.path === path);
		if (!found) throw new Error(`${path} was not found in src/app`);
		return found;
	};

	it("finds pages through route groups, and no API routes", () => {
		expect(route("/hub/jobs").path).toBe("/hub/jobs");
		expect(routes.some((row) => row.path.startsWith("/api"))).toBe(false);
		expect(routes.some((row) => row.path.includes("("))).toBe(false);
	});

	it("takes a space's insider from its gate, and refuses a plain member", () => {
		expect(route("/advisor/earnings")).toMatchObject({
			allowed: ["advisor"],
			refused: ["anonymous", "member"],
		});
		expect(route("/user/project/[slug]/team")).toMatchObject({
			allowed: ["author"],
			refused: ["anonymous", "member"],
		});
	});

	it("lets the super admin through a permission gate", () => {
		expect(route("/admin/payouts")).toMatchObject({
			allowed: ["superAdmin"],
			refused: ["anonymous", "member"],
		});
	});

	it("refuses a signed-out visitor and an unfinished onboarding under the proxy", () => {
		expect(route("/hub/jobs")).toMatchObject({
			allowed: ["member"],
			refused: ["anonymous", "unonboarded"],
		});
	});

	it("keeps the purchase open to an unfinished onboarding", () => {
		expect(route("/checkpoint/new").refused).toEqual(["anonymous"]);
	});

	it("leaves a public page open to everyone", () => {
		expect(route("/projects")).toMatchObject({
			allowed: ["anonymous", "member"],
			refused: [],
		});
	});

	describe("the address it opens", () => {
		const known = new Map([["/user/project/[slug]", "hollow-tide"]]);

		it("fills a parameter with its real value", () => {
			expect(addressOf("/user/project/[slug]/team", known)).toEqual({
				url: "/user/project/hollow-tide/team",
				real: true,
			});
		});

		it("says when a parameter is made up, so a 404 is fair", () => {
			expect(addressOf("/advisor/checkpoints/[id]", known)).toEqual({
				url: "/advisor/checkpoints/smoke-missing",
				real: false,
			});
		});

		it("drops an optional catch-all, and opens the root", () => {
			expect(addressOf("/blog/[[...rest]]", known).url).toBe("/blog");
			expect(addressOf("/", known)).toEqual({ url: "/", real: true });
		});

		it("does not expect a page that needs a query to open", () => {
			expect(addressOf("/checkpoint/new/checkout", known).real).toBe(false);
		});
	});
});
