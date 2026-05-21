import type { Metadata } from "next";
import { LegalDetailsClient } from "./LegalDetailsClient";

export const metadata: Metadata = {
	title: "Legal Details",
	alternates: { canonical: "/legal-details" },
	openGraph: { type: "website", url: "/legal-details", title: "Legal Details" },
};

export default function LegalDetailsPage() {
	return <LegalDetailsClient />;
}
