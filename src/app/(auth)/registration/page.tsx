import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { RegistrationClient } from "./RegistrationClient";

export const metadata: Metadata = {
	title: "Registration",
	alternates: { canonical: "/registration" },
	openGraph: { type: "website", url: "/registration", title: "Registration" },
	robots: { index: false, follow: false },
};

export default async function RegistrationPage() {
	const session = await getSession();
	if (session?.user) {
		redirect("/hub");
	}
	return <RegistrationClient />;
}
