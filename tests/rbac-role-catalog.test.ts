import { describe, expect, it } from "vitest";
import { SpaceRole } from "@/config/permissions/roles";
import {
	catalogOf,
	defaultsKey,
	defaultsOf,
	diffPermissions,
	permissionCatalog,
	splitByCatalog,
} from "@/services/access/role-catalog";

describe("catalogOf", () => {
	it("groups a space's permissions by feature", () => {
		const features = catalogOf("admin");
		const users = features.find((feature) => feature.feature === "users");

		expect(users?.permissions.map((row) => row.permission)).toEqual([
			"admin.users.view",
			"admin.users.manage",
		]);
	});

	it("covers the whole catalogue, with nothing counted twice", () => {
		const fromFeatures = catalogOf("admin").flatMap((feature) =>
			feature.permissions.map((row) => row.permission),
		);

		expect(fromFeatures.sort()).toEqual([...permissionCatalog("admin")].sort());
		expect(new Set(fromFeatures).size).toBe(fromFeatures.length);
	});
});

describe("defaultsOf", () => {
	it("gives the owner everything the admin space declares, and an admin all but payouts, curators and deleting checkpoints", () => {
		const defaults = defaultsOf("admin");
		const catalog = permissionCatalog("admin");
		const allowedTo = (role: SpaceRole) =>
			catalog.filter(
				(permission) => defaults.get(defaultsKey(role, permission))?.allowed,
			);

		expect(allowedTo(SpaceRole.Owner)).toEqual(catalog);
		// Money out and who may take it: granted by hand, never by default.
		expect(allowedTo(SpaceRole.Admin)).toEqual(
			catalog.filter(
				(permission) =>
					!permission.startsWith("admin.payouts.") &&
					!permission.startsWith("admin.curators.") &&
					// Irreversible: the owner's alone.
					permission !== "admin.checkpoints.delete",
			),
		);
	});

	it("gives a member the reads and nothing that manages", () => {
		const defaults = defaultsOf("admin");

		expect(defaults.get(defaultsKey(SpaceRole.Member, "admin.users.view"))).
			toMatchObject({ allowed: true });
		expect(
			defaults.get(defaultsKey(SpaceRole.Member, "admin.users.manage")),
		).toMatchObject({ allowed: false });
	});

	it("gives a guest nothing by default", () => {
		const defaults = defaultsOf("admin");
		const granted = permissionCatalog("admin").filter(
			(permission) =>
				defaults.get(defaultsKey(SpaceRole.Guest, permission))?.allowed,
		);

		expect(granted).toEqual([]);
	});

	it("keeps the hub guest exceptions the space declares", () => {
		const defaults = defaultsOf("hub");

		expect(
			defaults.get(defaultsKey(SpaceRole.Guest, "hub.projects.view")),
		).toMatchObject({ allowed: true });
		expect(
			defaults.get(defaultsKey(SpaceRole.Guest, "hub.talent_pool.view")),
		).toMatchObject({ allowed: false });
	});
});

describe("splitByCatalog", () => {
	it("separates what the space declares from what it does not", () => {
		const { known, unknown } = splitByCatalog("admin", [
			"admin.users.view",
			"admin.users.destroy",
			"project.info.edit",
		]);

		expect(known).toEqual(["admin.users.view"]);
		expect(unknown).toEqual(["admin.users.destroy", "project.info.edit"]);
	});

	it("refuses a permission of another space, however real it is", () => {
		const { unknown } = splitByCatalog("hub", ["admin.users.view"]);

		expect(unknown).toEqual(["admin.users.view"]);
	});
});

describe("diffPermissions", () => {
	it("reports what was added and what was taken away", () => {
		expect(diffPermissions(["a", "b"], ["b", "c"])).toEqual({
			added: ["c"],
			removed: ["a"],
		});
	});

	it("reports nothing when the sets match", () => {
		expect(diffPermissions(["a", "b"], ["a", "b"])).toEqual({
			added: [],
			removed: [],
		});
	});
});
