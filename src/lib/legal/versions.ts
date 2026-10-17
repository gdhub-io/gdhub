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
