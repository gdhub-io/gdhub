import type { Metadata } from "next";
import NotionService from "@/services/notion";
import { RefundPolicyClient } from "./RefundPolicyClient";

export const revalidate = 60;

export const metadata: Metadata = {
	title: "Refund Policy",
	alternates: { canonical: "/refund-policy" },
	openGraph: {
		type: "website",
		url: "/refund-policy",
		title: "Refund Policy",
	},
};

const REFUND_POLICY_BLOCK_ID = "36bdcc9e-9c9d-809d-96cb-cbc94cb83a99";

export default async function RefundPolicyPage() {
	const blocks = await NotionService.blocks.children.list({
		block_id: REFUND_POLICY_BLOCK_ID,
	});

	return <RefundPolicyClient blocks={blocks} />;
}
