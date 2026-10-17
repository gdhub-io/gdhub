import { describe, expect, it } from "vitest";
import { LEGAL_ENTITIES } from "@/config/legal/entities";
import {
	issuerOf,
	LEGAL_CODES,
	LEGAL_DOCUMENTS,
	legalDocument,
} from "@/config/legal/registry";
import { loadLegalText, renderLegalText } from "@/lib/legal/documents";
import {
	validUntil,
	versionInEffect,
} from "@/lib/legal/versions";

const published = LEGAL_CODES.flatMap((code) =>
	LEGAL_DOCUMENTS[code].versions.map((v) => ({ code, v })),
).filter(({ code }) => !legalDocument(code).withParams);

describe("legal registry", () => {
	it.each(published)(
		"$code v$v.version is the text its checksum was published with",
		({ code, v }) => {
			// A mismatch means a published file was edited: publish the change as the next version.
			expect(loadLegalText(code, v).checksum).toBe(v.checksum);
		},
	);

	it.each(LEGAL_CODES)(
		"%s versions are numbered and dated in order",
		(code) => {
			const versions = LEGAL_DOCUMENTS[code].versions;
			versions.forEach((v, i) => {
				expect(v.version).toBe(i + 1);
				if (i > 0) {
					expect(v.effectiveAt > versions[i - 1].effectiveAt).toBe(true);
				}
			});
		},
	);

	it.each(LEGAL_CODES)("%s in effect names the entity that issues it", (code) => {
		const current = versionInEffect(code);
		if (current) expect(current.entity).toBe(issuerOf(code));
	});

	it("slugs are unique", () => {
		const slugs = LEGAL_CODES.map((c) => LEGAL_DOCUMENTS[c].slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});
});

describe("versionInEffect", () => {
	it("is nothing before the first effective date and the version after it", () => {
		expect(versionInEffect("TermsOfUse", new Date("2026-10-16T23:59:59Z"))).toBeNull();
		expect(
			versionInEffect("TermsOfUse", new Date("2026-10-17T00:00:00Z"))?.version,
		).toBe(1);
	});
});

describe("renderLegalText", () => {
	const entity = LEGAL_ENTITIES.vsi;

	it("fills the entity and the params", () => {
		expect(
			renderLegalText(
				"{{entity.name}} · {{params.share}}% · {{ entity.currency }}",
				entity,
				{ share: 10 },
			),
		).toBe(`${entity.name} · 10% · USD`);
	});

	it("refuses a placeholder it cannot fill", () => {
		expect(() => renderLegalText("{{entity.fax}}", entity)).toThrow(
			/entity\.fax/,
		);
		expect(() => renderLegalText("{{params.share}}", entity)).toThrow();
	});
});

describe("validUntil", () => {
	const v = (version: number, effectiveAt: string, materialChange: boolean) => ({
		version,
		effectiveAt,
		materialChange,
		entity: "vsi" as const,
		checksum: "",
	});
	const versions = [
		v(1, "2026-01-01", true),
		v(2, "2026-03-01", false),
		v(3, "2026-06-01", true),
	];

	it("ends at the next material version, skipping a non-material one", () => {
		expect(validUntil(versions, 1)).toBe("2026-06-01");
		expect(validUntil(versions, 2)).toBe("2026-06-01");
	});

	it("is open for the latest material version", () => {
		expect(validUntil(versions, 3)).toBeNull();
		expect(validUntil(LEGAL_DOCUMENTS.TermsOfUse.versions, 1)).toBeNull();
	});
});
