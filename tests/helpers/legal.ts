import {
	LEGAL_DOCUMENTS,
	type LegalCode,
	type LegalVersion,
} from "@/config/legal/registry";

/**
 * Puts a v1 in effect for a document not published yet, so the rules that ask
 * for it can be tested before it goes live. Vitest isolates each file, so the
 * change stays inside the file that calls it.
 */
export const publishForTest = (code: LegalCode) => {
	const versions = LEGAL_DOCUMENTS[code].versions as unknown as LegalVersion[];
	if (versions.length) return;
	versions.push({
		version: 1,
		effectiveAt: "2026-01-01",
		entity: "founder",
		materialChange: false,
		checksum: "",
	});
};
