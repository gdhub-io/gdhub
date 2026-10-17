import type { Metadata } from "next";
import { LegalDetailsClient } from "./LegalDetailsClient";

export const metadata: Metadata = {
	title: "Legal Details",
	description: "The legal entity that operates gdhub.io",
	alternates: { canonical: "/legal-details" },
	openGraph: {
		type: "website",
		url: "/legal-details",
		title: "Legal Details",
		description: "The legal entity that operates gdhub.io",
	},
};

export default function LegalDetailsPage() {
	return <LegalDetailsClient />;
}
