import { describe, expect, it } from "vitest";
import { formatAuditValue, normalizeAuditChanges } from "@/helpers/audit";

describe("normalizeAuditChanges — v2 payloads", () => {
	it("reads a before/after diff", () => {
		const result = normalizeAuditChanges({
			v: 2,
			diff: { status: { from: "Draft", to: "Published" } },
			fields: ["status"],
			target: { id: "v1" },
		});

		expect(result.version).toBe(2);
		expect(result.entries).toEqual([
			{ field: "status", from: "Draft", to: "Published", valueUnknown: false },
		]);
	});

	it("marks a field with no recorded value as unknown", () => {
		// A personal or non-allowlisted field: the name is in `fields` but the value
		// is deliberately absent — rendering it as "no change" would be a lie.
		const result = normalizeAuditChanges({
			v: 2,
			diff: { status: { from: "Draft", to: "Published" } },
			fields: ["status", "name", "description"],
		});

		expect(result.entries.map((entry) => entry.valueUnknown)).toEqual([
			false,
			true,
			true,
		]);
	});

	it("omits `from` when no snapshot was taken", () => {
		const result = normalizeAuditChanges({
			v: 2,
			diff: { status: { to: "Approved" } },
			fields: ["status"],
		});

		expect("from" in result.entries[0]).toBe(false);
		expect(result.entries[0].to).toBe("Approved");
	});

	it("reads a create's `after` block", () => {
		const result = normalizeAuditChanges({
			v: 2,
			after: { title: "Unity dev", status: "Published" },
			fields: ["title", "status", "description"],
		});

		expect(result.entries).toEqual([
			{ field: "title", to: "Unity dev", valueUnknown: false },
			{ field: "status", to: "Published", valueUnknown: false },
			{ field: "description", valueUnknown: true },
		]);
	});

	it("reads a delete snapshot that lists no fields", () => {
		const result = normalizeAuditChanges({
			v: 2,
			before: { title: "Old vacancy", status: "Closed" },
			fields: [],
			target: { id: "v1" },
		});

		expect(result.entries).toEqual([
			{ field: "title", from: "Old vacancy", valueUnknown: false },
			{ field: "status", from: "Closed", valueUnknown: false },
		]);
	});

	it("keeps nothing of a deleted profile beyond the fact of the delete", () => {
		const result = normalizeAuditChanges({
			v: 2,
			before: {},
			fields: [],
			target: { id: "pr1" },
		});

		expect(result.entries).toEqual([]);
	});

	it("surfaces a capped bulk write rather than hiding the truncation", () => {
		const result = normalizeAuditChanges({
			v: 2,
			count: 60,
			fields: ["status"],
			target: { ids: ["m1", "m2"], truncated: true },
			filter: { teamId: "t1" },
		});

		expect(result.count).toBe(60);
		expect(result.truncated).toBe(true);
	});
});

describe("normalizeAuditChanges — legacy payloads", () => {
	it("reads the old write payload as after-only values", () => {
		const result = normalizeAuditChanges({
			where: "[complex]",
			data: { status: "Approved", name: "Game" },
		});

		expect(result.version).toBeNull();
		expect(result.entries).toEqual([
			{ field: "status", to: "Approved", valueUnknown: false },
			{ field: "name", to: "Game", valueUnknown: false },
		]);
	});

	it("yields nothing for the empty legacy update, which recorded nothing", () => {
		const result = normalizeAuditChanges({ where: "[complex]", data: null });

		expect(result.version).toBeNull();
		expect(result.entries).toEqual([]);
	});

	it("reads a legacy bulk count", () => {
		const result = normalizeAuditChanges({ where: "[complex]", count: 3 });

		expect(result.count).toBe(3);
		expect(result.entries).toEqual([]);
	});

	it("tolerates a null or non-object payload", () => {
		expect(normalizeAuditChanges(null).entries).toEqual([]);
		expect(normalizeAuditChanges("nope").entries).toEqual([]);
		expect(normalizeAuditChanges([1, 2]).entries).toEqual([]);
	});
});

describe("formatAuditValue", () => {
	it("distinguishes null, undefined and an empty string", () => {
		expect(formatAuditValue(null)).toBe("null");
		expect(formatAuditValue(undefined)).toBe("—");
		expect(formatAuditValue("")).toBe('""');
	});

	it("renders scalars and arrays readably", () => {
		expect(formatAuditValue(false)).toBe("false");
		expect(formatAuditValue(42)).toBe("42");
		expect(formatAuditValue(["a", "b"])).toBe("a, b");
	});
});
