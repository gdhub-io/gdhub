import type { Metadata } from "next";
import NotionService from "@/services/notion";
import { CookiePolicyClient } from "./CookiePolicyClient";

export const revalidate = 60;

export const metadata: Metadata = {
	title: "Cookie Policy",
	alternates: { canonical: "/cookie-policy" },
	openGraph: { type: "website", url: "/cookie-policy", title: "Cookie Policy" },
};

const COOKIE_POLICY_BLOCK_ID = "c3fb3089-a57e-42f1-8383-3b13ea4842de";

export default async function CookiePolicyPage() {
	const blocks = await NotionService.blocks.children.list({
		block_id: COOKIE_POLICY_BLOCK_ID,
	});

	return <CookiePolicyClient blocks={blocks} />;
}
