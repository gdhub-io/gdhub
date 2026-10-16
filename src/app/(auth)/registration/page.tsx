import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
	CHECKPOINT_ENTRY_HREF,
	CHECKPOINT_INTENT,
} from "@/components/checkpoints/entry/hrefs";
import { RegistrationClient } from "./RegistrationClient";

export const metadata: Metadata = {
	title: "Registration",
	alternates: { canonical: "/registration" },
	openGraph: { type: "website", url: "/registration", title: "Registration" },
	robots: { index: false, follow: false },
};

export default async function RegistrationPage({
	searchParams,
}: {
	searchParams: Promise<{ intent?: string }>;
}) {
	const session = await auth();
	if (session?.user) {
		const { intent } = await searchParams;
		redirect(intent === CHECKPOINT_INTENT ? CHECKPOINT_ENTRY_HREF : "/hub");
	}
	return <RegistrationClient />;
}
