import { afterEach, describe, expect, it, vi } from "vitest";
import type { MatrixRow } from "@/config/permissions/matrix";
import { SpaceRole } from "@/config/permissions/roles";
import {
	getMatrixHealth,
	invalidateMatrix,
	permissionsForRole,
	setMatrixSource,
} from "@/services/access/matrix-source";

const storedRow = (allowed: boolean): MatrixRow => ({
	spaceType: "project",
	role: SpaceRole.Member,
	permission: "project.members.invite",
	allowed,
	scope: null,
});

const silence = () => {
	vi.spyOn(console, "warn").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
	vi.spyOn(console, "info").mockImplementation(() => {});
};

afterEach(() => {
	setMatrixSource();
	vi.restoreAllMocks();
});

describe("matrix source health", () => {
	it("uses the stored matrix when the table has rows", async () => {
		silence();
		setMatrixSource(() => [storedRow(true)]);

		const permissions = await permissionsForRole("project", SpaceRole.Member);

		expect(getMatrixHealth().source).toBe("stored");
		expect(permissions.has("project.members.invite")).toBe(true);
	});

	it("falls back to the generated defaults only when the table is empty", async () => {
		silence();
		setMatrixSource(() => []);

		const permissions = await permissionsForRole("project", SpaceRole.Member);

		expect(getMatrixHealth().source).toBe("defaults");
		// The defaults never hand `invite` to a member.
		expect(permissions.has("project.members.invite")).toBe(false);
		expect(permissions.has("project.workflow.view")).toBe(true);
	});

	it("serves the last snapshot when the read fails — never the defaults", async () => {
		silence();

		// One source that works and then starts failing, the way a database does.
		let failing = false;
		setMatrixSource(() => {
			if (failing) throw new Error("connection refused");

			// An admin revoked a permission the code defaults would grant.
			return [
				storedRow(true),
				{
					spaceType: "project",
					role: SpaceRole.Member,
					permission: "project.workflow.view",
					allowed: false,
					scope: null,
				},
			];
		});

		await permissionsForRole("project", SpaceRole.Member);

		failing = true;
		invalidateMatrix();

		const permissions = await permissionsForRole("project", SpaceRole.Member);

		expect(getMatrixHealth().source).toBe("stale");
		expect(getMatrixHealth().lastError).toContain("connection refused");
		// The revocation survives the outage — this is the whole point: falling
		// back to the code defaults would silently hand the permission back.
		expect(permissions.has("project.workflow.view")).toBe(false);
		expect(permissions.has("project.members.invite")).toBe(true);
	});

	it("denies everything when the read fails and nothing was ever loaded", async () => {
		silence();
		setMatrixSource(() => {
			throw new Error("connection refused");
		});

		const permissions = await permissionsForRole("project", SpaceRole.Member);

		expect(getMatrixHealth().source).toBe("unavailable");
		expect(permissions.size).toBe(0);
	});

	it("recovers once the database answers again", async () => {
		silence();
		setMatrixSource(() => {
			throw new Error("connection refused");
		});
		await permissionsForRole("project", SpaceRole.Member);
		expect(getMatrixHealth().source).toBe("unavailable");

		setMatrixSource(() => [storedRow(true)]);

		const permissions = await permissionsForRole("project", SpaceRole.Member);

		expect(getMatrixHealth().source).toBe("stored");
		expect(permissions.has("project.members.invite")).toBe(true);
	});

	it("logs a state change once, not on every read", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "info").mockImplementation(() => {});

		setMatrixSource(() => {
			throw new Error("connection refused");
		});

		await permissionsForRole("project", SpaceRole.Member);
		invalidateMatrix();
		await permissionsForRole("project", SpaceRole.Member);

		expect(error).toHaveBeenCalledTimes(1);
	});
});
