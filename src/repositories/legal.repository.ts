import { LEGAL_DOCUMENTS, type LegalCode } from "@/config/legal/registry";
import { versionInEffect } from "@/lib/legal/versions";
import { prisma } from "@/services/prisma";

/** Whether the user accepted the version of `code` in effect now. */
export async function hasAcceptedCurrent(
	userId: string,
	code: LegalCode,
): Promise<boolean> {
	const current = versionInEffect(code);
	if (!current) return false;
	const row = await prisma.legalAcceptance.findFirst({
		where: { userId, code, version: current.version },
		select: { id: true },
	});
	return row !== null;
}

/** The documents a user is bound by: the Terms always, the rest by what they do. */
async function documentsThatApply(userId: string): Promise<LegalCode[]> {
	const [advisor, expert] = await Promise.all([
		prisma.speciality.count({ where: { userId, isOpenForMentoring: true } }),
		prisma.expertProfile.findUnique({
			where: { userId },
			select: { paidConsultations: true, curation: true },
		}),
	]);
	return [
		"TermsOfUse",
		...(advisor > 0 ? (["AdvisorAgreement"] as const) : []),
		...(expert?.paidConsultations || expert?.curation
			? (["ExpertServicesTerms"] as const)
			: []),
	];
}

/**
 * True when nothing accepted yet stands, or a later version than the one
 * accepted made a material change. A typo fixed in v3 does not ask again.
 */
export function needsAcceptance(
	code: LegalCode,
	acceptedVersion: number | undefined,
	now: Date = new Date(),
): boolean {
	const current = versionInEffect(code, now);
	if (!current) return false;
	if (acceptedVersion === undefined) return true;
	return LEGAL_DOCUMENTS[code].versions.some(
		(v) =>
			v.version > acceptedVersion &&
			v.version <= current.version &&
			v.materialChange,
	);
}

/** The documents the user has to accept before going on, oldest-first registry order. */
export async function pendingLegalCodes(userId: string): Promise<LegalCode[]> {
	const codes = await documentsThatApply(userId);
	const rows = await prisma.legalAcceptance.findMany({
		where: { userId, code: { in: codes } },
		select: { code: true, version: true },
	});
	const latest = new Map<string, number>();
	for (const row of rows) {
		latest.set(row.code, Math.max(latest.get(row.code) ?? 0, row.version));
	}
	return codes.filter((code) => needsAcceptance(code, latest.get(code)));
}
