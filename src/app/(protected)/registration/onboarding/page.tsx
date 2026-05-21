import type { Metadata } from "next";
import { OnboardingClient } from "./OnboardingClient";

export const metadata: Metadata = {
	title: "Registration",
	robots: { index: false, follow: false },
	alternates: { canonical: "/registration/onboarding" },
	openGraph: {
		type: "website",
		url: "/registration/onboarding",
		title: "Registration",
	},
};

export default function OnboardingPage() {
	return <OnboardingClient />;
}
