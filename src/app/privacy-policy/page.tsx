import type { Metadata } from "next";
import NotionService from "@/services/notion";
import { PrivacyPolicyClient } from "./PrivacyPolicyClient";

export const revalidate = 60;

export const metadata: Metadata = {
	title: "Privacy Policy",
};

const PRIVACY_POLICY_BLOCK_ID = "328dcc9e-9c9d-8004-a1e0-c4305158e566";

export default async function PrivacyPolicyPage() {
	const blocks = await NotionService.blocks.children.list({
		block_id: PRIVACY_POLICY_BLOCK_ID,
	});

	return <PrivacyPolicyClient blocks={blocks} />;
}
