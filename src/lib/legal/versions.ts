import {
	LEGAL_DOCUMENTS,
	type LegalCode,
	type LegalVersion,
} from "@/config/legal/registry";

/** Midnight UTC of the effective date: a version takes effect for everyone at once. */
const effectiveFrom = (v: LegalVersion) =>
	Date.parse(`${v.effectiveAt}T00:00:00Z`);

export function versionInEffect(
	code: LegalCode,
	now: Date = new Date(),
): LegalVersion | null {
	const due = LEGAL_DOCUMENTS[code].versions.filter(
		(v) => effectiveFrom(v) <= now.getTime(),
	);
	return due.length ? due[due.length - 1] : null;
}

/**
 * When an acceptance of `version` stops binding: the date the next material
 * version takes effect, or null while none is published. A non-material
 * version does not end it.
 */
export function validUntil(
	versions: readonly LegalVersion[],
	version: number,
): string | null {
	return (
		versions.find((v) => v.version > version && v.materialChange)
			?.effectiveAt ?? null
	);
}

export const acceptanceValidUntil = (code: LegalCode, version: number) =>
	validUntil(LEGAL_DOCUMENTS[code].versions, version);
