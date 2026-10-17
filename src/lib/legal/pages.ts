import {
	LEGAL_CODES,
	LEGAL_DOCUMENTS,
	type LegalCode,
	legalDocument,
} from "@/config/legal/registry";
import { loadLegalText } from "./documents";
import { versionInEffect } from "./versions";

export type LegalVersionStatus = "current" | "archived" | "scheduled";

export type LegalVersionRow = {
	version: number;
	effectiveAt: string;
	status: LegalVersionStatus;
};

export type LegalPageData = {
	code: LegalCode;
	slug: string;
	title: string;
	version: number;
	effectiveAt: string;
	status: LegalVersionStatus;
	text: string;
	/** The version in effect, for the archived banner. */
	current: { version: number; effectiveAt: string } | null;
	versions: LegalVersionRow[];
};

export const legalCodeBySlug = (slug: string): LegalCode | undefined =>
	LEGAL_CODES.find((code) => LEGAL_DOCUMENTS[code].slug === slug);

function rows(code: LegalCode, now: Date): LegalVersionRow[] {
	const current = versionInEffect(code, now);
	return LEGAL_DOCUMENTS[code].versions.map((v) => ({
		version: v.version,
		effectiveAt: v.effectiveAt,
		status:
			v.version === current?.version
				? "current"
				: current && v.version < current.version
					? "archived"
					: "scheduled",
	}));
}

/**
 * One version of a document as the public page shows it — the one in effect
 * when `version` is omitted. Project agreements have no public page: their
 * text exists only filled in for a project.
 */
export function loadLegalPage(
	slug: string,
	version?: number,
	now: Date = new Date(),
): LegalPageData | null {
	const code = legalCodeBySlug(slug);
	if (!code || legalDocument(code).withParams) return null;
	const current = versionInEffect(code, now);
	const shown =
		version === undefined
			? current
			: LEGAL_DOCUMENTS[code].versions.find((v) => v.version === version);
	if (!shown) return null;
	const versions = rows(code, now);
	const { text } = loadLegalText(code, shown);
	return {
		code,
		slug,
		title: LEGAL_DOCUMENTS[code].title,
		version: shown.version,
		effectiveAt: shown.effectiveAt,
		status:
			versions.find((r) => r.version === shown.version)?.status ?? "current",
		text,
		current: current
			? { version: current.version, effectiveAt: current.effectiveAt }
			: null,
		versions,
	};
}

export type LegalIndexItem = {
	code: LegalCode;
	slug: string;
	title: string;
	group: "platform" | "features";
	version: number;
	effectiveAt: string;
};

/** Every document with a version in effect — a document with no text yet is not listed. */
export function legalIndex(now: Date = new Date()): LegalIndexItem[] {
	return LEGAL_CODES.flatMap((code) => {
		const doc = legalDocument(code);
		const current = versionInEffect(code, now);
		if (!current || doc.withParams) return [];
		return [
			{
				code,
				slug: doc.slug,
				title: doc.title,
				group: doc.group,
				version: current.version,
				effectiveAt: current.effectiveAt,
			},
		];
	});
}
