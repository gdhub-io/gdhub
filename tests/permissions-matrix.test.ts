import { describe, expect, it } from "vitest";
import { ACTION_CLASS, ACTIONS } from "@/config/permissions/actions";
import {
	buildPermissionMatrix,
	matrixLookup,
} from "@/config/permissions/matrix";
import {
	ROLE_SENIORITY,
	roleAtLeast,
	SPACE_ROLES,
	SpaceRole,
	strongestRole,
} from "@/config/permissions/roles";
import { SPACES, spaceList } from "@/config/spaces";
import {
	defineSpace,
	permissionsOf,
	registerSpaces,
} from "@/config/spaces/define-space";

const lookup = matrixLookup(buildPermissionMatrix(spaceList()));
const cell = (role: string, permission: string) =>
	lookup.get(`${role}:${permission}`);

describe("action catalogue", () => {
	it("every action has a class", () => {
		for (const action of ACTIONS) {
			expect(ACTION_CLASS[action]).toBeDefined();
		}
	});
});

describe("role seniority", () => {
	it("picks the strongest role", () => {
		expect(
			strongestRole([SpaceRole.Member, SpaceRole.Owner, SpaceRole.Guest]),
		).toBe(SpaceRole.Owner);
		expect(strongestRole([SpaceRole.Guest, SpaceRole.Member])).toBe(
			SpaceRole.Member,
		);
		expect(strongestRole([null, undefined])).toBeNull();
	});

	it("compares roles", () => {
		expect(roleAtLeast(SpaceRole.Owner, SpaceRole.Admin)).toBe(true);
		expect(roleAtLeast(SpaceRole.Admin, SpaceRole.Admin)).toBe(true);
		expect(roleAtLeast(SpaceRole.Member, SpaceRole.Admin)).toBe(false);
	});

	it("covers every role", () => {
		expect([...ROLE_SENIORITY].sort()).toEqual([...SPACE_ROLES].sort());
	});
});

describe("defineSpace validation", () => {
	it("rejects an unknown action", () => {
		expect(() =>
			defineSpace({
				type: "broken",
				// @ts-expect-error — "approve" is not in ACTIONS
				features: { things: ["approve"] },
			}),
		).toThrow(/unknown action/);
	});

	it("rejects a feature without actions", () => {
		expect(() =>
			defineSpace({ type: "broken", features: { things: [] } }),
		).toThrow(/no actions/);
	});

	it("rejects an override pointing at a permission the space does not declare", () => {
		expect(() =>
			defineSpace({
				type: "broken",
				features: { things: ["view"] },
				overrides: { [SpaceRole.Guest]: ["broken.things.edit"] },
			}),
		).toThrow(/does not declare/);
	});

	it("rejects an override for an unknown role", () => {
		expect(() =>
			defineSpace({
				type: "broken",
				features: { things: ["view"] },
				// @ts-expect-error — "editor" is not a space role
				overrides: { Editor: ["broken.things.view"] },
			}),
		).toThrow(/unknown role/);
	});

	it("rejects duplicate space types", () => {
		const a = defineSpace({ type: "twin", features: { things: ["view"] } });
		const b = defineSpace({ type: "twin", features: { others: ["view"] } });

		expect(() => registerSpaces([a, b])).toThrow(/duplicate space type/);
	});
});

describe("permission list", () => {
	it("builds space.feature.action strings", () => {
		const space = defineSpace({
			type: "sample",
			features: { info: ["view", "edit"], tools: ["use"] },
		});

		expect(permissionsOf(space)).toEqual([
			"sample.info.view",
			"sample.info.edit",
			"sample.tools.use",
		]);
	});
});

describe("matrix defaults by action class", () => {
	it("read actions go to member and above", () => {
		expect(cell(SpaceRole.Member, "project.workflow.view")?.allowed).toBe(true);
		expect(cell(SpaceRole.Admin, "project.workflow.view")?.allowed).toBe(true);
		expect(cell(SpaceRole.Owner, "project.workflow.view")?.allowed).toBe(true);
	});

	it("manage actions stop at admin", () => {
		expect(cell(SpaceRole.Member, "project.members.invite")?.allowed).toBe(false);
		expect(cell(SpaceRole.Admin, "project.members.invite")?.allowed).toBe(true);
		expect(cell(SpaceRole.Owner, "project.members.invite")?.allowed).toBe(true);
	});

	it("destructive actions belong to the owner only", () => {
		expect(cell(SpaceRole.Admin, "project.lifecycle.delete")?.allowed).toBe(false);
		expect(cell(SpaceRole.Owner, "project.lifecycle.delete")?.allowed).toBe(true);
		expect(cell(SpaceRole.Admin, "project.lifecycle.archive")?.allowed).toBe(false);
	});

	it("gives a guest nothing by default", () => {
		expect(cell(SpaceRole.Guest, "project.workflow.view")?.allowed).toBe(false);
		expect(cell(SpaceRole.Guest, "project.members.view")?.allowed).toBe(false);
		expect(cell(SpaceRole.Guest, "event.content.view")?.allowed).toBe(false);
	});
});

describe("matrix overrides", () => {
	it("grants the listed permissions to a guest", () => {
		expect(cell(SpaceRole.Guest, "project.info.view")?.allowed).toBe(true);
		expect(cell(SpaceRole.Guest, "project.devlog.view")?.allowed).toBe(true);
		expect(cell(SpaceRole.Guest, "event.schedule.view")?.allowed).toBe(true);
		expect(cell(SpaceRole.Guest, "course.curriculum.view")?.allowed).toBe(true);
		expect(cell(SpaceRole.Guest, "hub.projects.view")?.allowed).toBe(true);
	});

	it("revokes a default with `false` — the preview live room", () => {
		expect(cell(SpaceRole.Member, "hub.live_room.use")?.allowed).toBe(false);
		expect(cell(SpaceRole.Admin, "hub.live_room.use")?.allowed).toBe(true);
		expect(cell(SpaceRole.Admin, "hub.live_room.manage")?.allowed).toBe(true);
	});

	it("narrows a permission to `own`", () => {
		expect(cell(SpaceRole.Member, "project.equity.view")).toEqual({
			allowed: true,
			scope: "own",
		});
		// Managers see the whole cap table.
		expect(cell(SpaceRole.Admin, "project.equity.view")?.scope).toBeNull();
	});
});

describe("registry", () => {
	it("registers every space", () => {
		expect(Object.keys(SPACES).sort()).toEqual([
			"admin",
			"course",
			"dev",
			"event",
			"hub",
			"project",
			"scout",
		]);
	});

	it("has a row for every role of every permission", () => {
		const rows = buildPermissionMatrix(spaceList());
		const permissions = spaceList().flatMap(permissionsOf);

		expect(rows).toHaveLength(permissions.length * SPACE_ROLES.length);
	});

	it("keeps the hub free of info and lifecycle", () => {
		expect(SPACES.hub.features).not.toHaveProperty("info");
		expect(SPACES.hub.features).not.toHaveProperty("lifecycle");
	});

	it("has no `view` permission for a space itself", () => {
		const bare = spaceList()
			.flatMap(permissionsOf)
			.filter((permission) => permission.split(".").length !== 3);

		expect(bare).toEqual([]);
	});

	it("inherits the admin and dev role from the hub", () => {
		expect(SPACES.admin.inheritRoleFrom).toEqual({
			space: "hub",
			atLeast: SpaceRole.Admin,
		});
		expect(SPACES.dev.inheritRoleFrom).toEqual({
			space: "hub",
			atLeast: SpaceRole.Admin,
		});
	});
});
