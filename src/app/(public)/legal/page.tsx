import type { Metadata } from "next";
import { legalIndex } from "@/lib/legal/pages";
import { LegalIndexClient } from "./LegalIndexClient";

// Versions take effect by date; an hourly rebuild moves a scheduled one in without a deploy.
export const revalidate = 3600;

export const metadata: Metadata = {
	title: "Legal",
	alternates: { canonical: "/legal" },
	openGraph: { type: "website", url: "/legal", title: "Legal" },
};

export default function LegalIndexPage() {
	return <LegalIndexClient items={legalIndex()} />;
}
