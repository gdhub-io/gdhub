import type { Metadata } from "next";
import { requireSession } from "@/helpers/require-session";
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

// Onboarding sits in the (auth) group to inherit AuthShell (white, form-style
// layout) but is only for authenticated users — middleware already enforces
// this; the explicit guard makes the intent visible at the page level.
export default async function OnboardingPage() {
	await requireSession("/registration/onboarding");
	return <OnboardingClient />;
}
