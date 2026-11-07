import { describe, expect, it } from "vitest";
import { headerForPath } from "@/components/layouts/SpaceHeader";

const project = { scope: "/user/project/alpha" };

describe("headerForPath", () => {
	it("keeps a space's header on its own tabs", () => {
		expect(headerForPath(project, "/user/project/alpha")).toBe(project);
		expect(headerForPath(project, "/user/project/alpha/team")).toBe(project);
		expect(headerForPath(project, "/user/project/alpha/workflow/3")).toBe(
			project,
		);
	});

	it("drops it once the path leaves the space", () => {
		expect(headerForPath(project, "/hub")).toBeNull();
		expect(headerForPath(project, "/user/project/beta/team")).toBeNull();
	});

	it("does not mistake a longer slug for the same space", () => {
		expect(headerForPath(project, "/user/project/alpha-2/team")).toBeNull();
	});

	it("leaves an unscoped header to its page's unmount", () => {
		const unscoped = { menuItems: [] };
		expect(headerForPath(unscoped, "/anywhere")).toBe(unscoped);
		expect(headerForPath(null, "/hub")).toBeNull();
	});
});
