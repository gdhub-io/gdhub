import type { Metadata } from "next";
import { VerifyClient } from "./VerifyClient";

export const metadata: Metadata = {
	title: "Verify a Certificate",
	description: "Confirm the authenticity of a gdhub certificate by its number.",
	alternates: { canonical: "/verify" },
	robots: { index: false, follow: false },
	openGraph: {
		type: "website",
		url: "/verify",
		title: "Verify a Certificate",
		description:
			"Confirm the authenticity of a gdhub certificate by its number.",
	},
};

export default function VerifyPage() {
	return <VerifyClient />;
}
