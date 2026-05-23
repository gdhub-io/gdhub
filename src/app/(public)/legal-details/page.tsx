import type { Metadata } from "next";
import { LegalDetailsClient } from "./LegalDetailsClient";

export const metadata: Metadata = {
	title: "Legal Details",
	description:
		"Official legal information about Game Developers Hub and its representative offices",
	alternates: { canonical: "/legal-details" },
	openGraph: {
		type: "website",
		url: "/legal-details",
		title: "Legal Details",
		description:
			"Official legal information about Game Developers Hub and its representative offices",
	},
};

export default function LegalDetailsPage() {
	return <LegalDetailsClient />;
}
