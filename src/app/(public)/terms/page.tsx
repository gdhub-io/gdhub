import type { Metadata } from "next";
import NotionService from "@/services/notion";
import { TermsClient } from "./TermsClient";

export const revalidate = 60;

export const metadata: Metadata = {
	title: "Terms of Use",
	alternates: { canonical: "/terms" },
	openGraph: { type: "website", url: "/terms", title: "Terms of Use" },
};

const TERMS_BLOCK_ID = "369dcc9e-9c9d-80eb-9500-d7c40555fb9e";

export default async function TermsPage() {
	const blocks = await NotionService.blocks.children.list({
		block_id: TERMS_BLOCK_ID,
	});

	return <TermsClient blocks={blocks} />;
}
