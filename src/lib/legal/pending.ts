import {
	LEGAL_DOCUMENTS,
	type LegalCode,
	legalDocument,
} from "@/config/legal/registry";
import { pendingLegal } from "@/repositories/legal.repository";
import { versionInEffect } from "./versions";

export type PendingDocument = {
	code: LegalCode;
	title: string;
	version: number;
	effectiveAt: string;
	firstTime: boolean;
	changes: string[];
};

/** What the acceptance modal shows: each pending document and why it is asked. */
export async function pendingDocuments(
	userId: string,
): Promise<PendingDocument[]> {
	const pending = await pendingLegal(userId);
	return pending.flatMap(({ code, firstTime }) => {
		const current = versionInEffect(code);
		if (!current) return [];
		const changes =
			legalDocument(code).versions.find((v) => v.version === current.version)
				?.changes ?? [];
		return [
			{
				code,
				title: LEGAL_DOCUMENTS[code].title,
				version: current.version,
				effectiveAt: current.effectiveAt,
				firstTime,
				changes: [...changes],
			},
		];
	});
}
