import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_DOCUMENTS } from "@/config/legal/registry";
import { legalIndex, loadLegalPage } from "@/lib/legal/pages";
import { LegalDocumentClient } from "../LegalDocumentClient";

export const revalidate = 3600;

type Params = Promise<{ slug: string; version: string }>;

const versionNumber = (param: string) => {
	const match = /^v(\d+)$/.exec(param);
	return match ? Number(match[1]) : undefined;
};

export const generateStaticParams = () =>
	legalIndex().flatMap(({ code, slug }) =>
		LEGAL_DOCUMENTS[code].versions.map((v) => ({
			slug,
			version: `v${v.version}`,
		})),
	);

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { slug } = await params;
	// The text the user accepted lives here; the unversioned page is the one to index.
	return {
		alternates: { canonical: `/legal/${slug}` },
		robots: { index: false, follow: false },
	};
}

export default async function LegalVersionPage({ params }: { params: Params }) {
	const { slug, version } = await params;
	const n = versionNumber(version);
	const page = n === undefined ? null : loadLegalPage(slug, n);
	if (!page) notFound();
	return <LegalDocumentClient page={page} />;
}
