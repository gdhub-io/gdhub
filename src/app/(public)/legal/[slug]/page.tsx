import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { legalIndex, loadLegalPage } from "@/lib/legal/pages";
import { LegalDocumentClient } from "./LegalDocumentClient";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export const generateStaticParams = () =>
	legalIndex().map(({ slug }) => ({ slug }));

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const page = loadLegalPage((await params).slug);
	if (!page) return {};
	return {
		title: page.title,
		alternates: { canonical: `/legal/${page.slug}` },
		openGraph: {
			type: "website",
			url: `/legal/${page.slug}`,
			title: page.title,
		},
	};
}

export default async function LegalDocumentPage({
	params,
}: {
	params: Params;
}) {
	const page = loadLegalPage((await params).slug);
	if (!page) notFound();
	return <LegalDocumentClient page={page} />;
}
