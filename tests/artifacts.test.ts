import { describe, expect, it } from "vitest";
import {
	ARTIFACT_KINDS,
	type ArtifactListItem,
	kindOfType,
	sortArtifacts,
	TYPES_OF_KIND,
	toRows,
} from "@/components/MyProjectArtifacts/artifacts";
import { ProjectArtifactType } from "@/config/prisma-enums";

const artifact = (
	id: string,
	createdAt: string,
	step: ArtifactListItem["step"] = null,
	type: ProjectArtifactType = ProjectArtifactType.Other,
): ArtifactListItem => ({
	id,
	type,
	name: id,
	link: "https://example.com",
	createdAt,
	checkStatus: null,
	createdByUser: { name: "Marta", image: null },
	step,
});

const concepting = { id: "s1", name: "Concepting", order: 1 };
const prototyping = { id: "s2", name: "Prototyping", order: 2 };

describe("artifact kinds", () => {
	it("puts every type under exactly one kind", () => {
		expect(kindOfType(ProjectArtifactType.GameplayVideo)).toBe("video");
		expect(kindOfType(ProjectArtifactType.PrototypeVideo)).toBe("video");
		expect(kindOfType(ProjectArtifactType.Art)).toBe("image");
		expect(kindOfType(ProjectArtifactType.ExecutableBuild)).toBe("build");
		expect(kindOfType(ProjectArtifactType.Other)).toBe("other");
		for (const type of ["JDA", "Concept", "GDD", "NDA"] as const) {
			expect(kindOfType(ProjectArtifactType[type])).toBe("document");
		}
	});

	// The form offers TYPES_OF_KIND and the filter reads kindOfType: if they
	// disagree, an artifact is saved under one tab and listed under another.
	it("offers each type in the form under the kind the filter gives it", () => {
		const offered = ARTIFACT_KINDS.flatMap((kind) =>
			TYPES_OF_KIND[kind].map((type) => {
				expect(kindOfType(type)).toBe(kind);
				return type;
			}),
		);

		expect(offered.sort()).toEqual(Object.values(ProjectArtifactType).sort());
	});
});

describe("artifact grouping", () => {
	const list = [
		artifact("unsorted", "2026-03-03"),
		artifact("proto-late", "2026-09-26", prototyping),
		artifact("concept", "2026-07-12", concepting),
		artifact("proto-early", "2026-08-26", prototyping),
	];

	it("orders by stage, then date, with no stage last", () => {
		expect(sortArtifacts(list).map((item) => item.id)).toEqual([
			"concept",
			"proto-early",
			"proto-late",
			"unsorted",
		]);
	});

	it("puts one band above each stage", () => {
		const sorted = sortArtifacts(list);

		expect(
			toRows(sorted, sorted).map((row) =>
				row.row === "stage" ? `[${row.name}]` : row.artifact.id,
			),
		).toEqual([
			"[Concepting]",
			"concept",
			"[Prototyping]",
			"proto-early",
			"proto-late",
			"[null]",
			"unsorted",
		]);
	});

	it("counts a stage across pages, not on the page shown", () => {
		const sorted = sortArtifacts(list);
		const [band] = toRows(sorted.slice(1, 2), sorted);

		expect(band).toMatchObject({ row: "stage", name: "Prototyping", count: 2 });
	});
});
