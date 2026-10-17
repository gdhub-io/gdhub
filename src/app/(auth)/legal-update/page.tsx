import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LEGAL_DOCUMENTS, legalDocument } from "@/config/legal/registry";
import { loadLegalText } from "@/lib/legal/documents";
import { versionInEffect } from "@/lib/legal/versions";
import { pendingLegalCodes } from "@/repositories/legal.repository";
import { LegalUpdateClient, type PendingDocument } from "./LegalUpdateClient";

export const metadata: Metadata = {
	title: "Updated terms",
	robots: { index: false },
};

type SearchParams = Promise<{ callbackUrl?: string }>;

/** Only a path on this site, so the gate cannot be used to bounce someone elsewhere. */
const safeNext = (url?: string) =>
	url?.startsWith("/") && !url.startsWith("//") ? url : "/hub";

export default async function LegalUpdatePage({
	searchParams,
}: {
	searchParams: SearchParams;
}) {
	const session = await auth();
	const next = safeNext((await searchParams).callbackUrl);
	if (!session?.user) {
		redirect(`/signin?callbackUrl=${encodeURIComponent(next)}`);
	}

	const codes = await pendingLegalCodes(session.user.id);
	if (!codes.length) redirect(next);

	const documents: PendingDocument[] = codes.flatMap((code) => {
		const current = versionInEffect(code);
		if (!current) return [];
		const changes = legalDocument(code).versions.find(
			(v) => v.version === current.version,
		)?.changes;
		return [
			{
				code,
				title: LEGAL_DOCUMENTS[code].title,
				version: current.version,
				effectiveAt: current.effectiveAt,
				changes: changes ? [...changes] : [],
				text: loadLegalText(code, current).text,
			},
		];
	});

	return <LegalUpdateClient documents={documents} next={next} />;
}
