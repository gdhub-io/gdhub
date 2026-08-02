import { describe, expect, it } from "vitest";
import type { MatrixRow } from "@/config/permissions/matrix";
import { SpaceRole } from "@/config/permissions/roles";
import {
	planMatrixSync,
	type StoredRow,
} from "@/services/access/matrix-sync";

const desired = (
	overrides: Partial<MatrixRow> & Pick<MatrixRow, "permission">,
): MatrixRow => ({
	spaceType: "project",
	role: SpaceRole.Member,
	allowed: true,
	scope: null,
	...overrides,
});

/** A stored row that the seeder wrote and nobody touched afterwards. */
const generated = (overrides: Partial<StoredRow> = {}): StoredRow => {
	const createdAt = new Date("2026-01-01T00:00:00Z");

	return {
		id: "row-1",
		spaceType: "project",
		role: SpaceRole.Member,
		permission: "project.workflow.view",
		allowed: true,
		scope: null,
		createdAt,
		updatedAt: createdAt,
		...overrides,
	};
};

/** The same row after somebody unticked it in the admin UI. */
const handEdited = (overrides: Partial<StoredRow> = {}): StoredRow =>
	generated({
		updatedAt: new Date("2026-02-01T00:00:00Z"),
		...overrides,
	});

describe("planMatrixSync", () => {
	it("creates rows that do not exist yet", () => {
		const plan = planMatrixSync(
			[desired({ permission: "project.workflow.view" })],
			[],
		);

		expect(plan.create).toEqual([
			{
				spaceType: "project",
				role: SpaceRole.Member,
				permission: "project.workflow.view",
				allowed: true,
				scope: null,
			},
		]);
		expect(plan.update).toHaveLength(0);
		expect(plan.remove).toHaveLength(0);
	});

	it("does nothing when the stored row already matches", () => {
		const plan = planMatrixSync(
			[desired({ permission: "project.workflow.view" })],
			[generated()],
		);

		expect(plan).toEqual({
			create: [],
			update: [],
			keepEdited: [],
			remove: [],
		});
	});

	it("updates a generated row whose default changed", () => {
		const plan = planMatrixSync(
			[desired({ permission: "project.workflow.view", allowed: false })],
			[generated({ allowed: true })],
		);

		expect(plan.update).toEqual([
			{
				id: "row-1",
				allowed: false,
				scope: null,
				key: "project:Member:project.workflow.view",
			},
		]);
	});

	it("keeps a hand-edited row — the point of the whole exercise", () => {
		const plan = planMatrixSync(
			[desired({ permission: "project.workflow.view", allowed: true })],
			[handEdited({ allowed: false })],
		);

		expect(plan.update).toHaveLength(0);
		expect(plan.keepEdited).toEqual(["project:Member:project.workflow.view"]);
	});

	it("overwrites a hand-edited row when forced", () => {
		const plan = planMatrixSync(
			[desired({ permission: "project.workflow.view", allowed: true })],
			[handEdited({ allowed: false })],
			{ force: true },
		);

		expect(plan.keepEdited).toHaveLength(0);
		expect(plan.update).toHaveLength(1);
	});

	it("notices a changed scope, not only a changed flag", () => {
		const plan = planMatrixSync(
			[desired({ permission: "project.equity.view", scope: "own" })],
			[generated({ permission: "project.equity.view", scope: null })],
		);

		expect(plan.update[0]?.scope).toBe("own");
	});

	it("removes permissions that left the catalogue", () => {
		const plan = planMatrixSync(
			[desired({ permission: "project.workflow.view" })],
			[
				generated(),
				generated({
					id: "row-stale",
					permission: "project.gantt.view",
				}),
			],
		);

		expect(plan.remove).toEqual([
			{ id: "row-stale", key: "project:Member:project.gantt.view" },
		]);
	});

	it("removes a stale row even when it was hand-edited", () => {
		// Nothing reads that permission any more, so keeping the checkbox would
		// only confuse the admin UI.
		const plan = planMatrixSync(
			[],
			[handEdited({ id: "row-stale", permission: "project.gantt.view" })],
		);

		expect(plan.remove).toHaveLength(1);
		expect(plan.keepEdited).toHaveLength(0);
	});

	it("treats every role of a permission separately", () => {
		const plan = planMatrixSync(
			[
				desired({ permission: "project.workflow.view", role: SpaceRole.Member }),
				desired({ permission: "project.workflow.view", role: SpaceRole.Guest }),
			],
			[generated()],
		);

		expect(plan.create).toHaveLength(1);
		expect(plan.create[0]?.role).toBe(SpaceRole.Guest);
	});
});
