import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import {
	CHECKPOINT_INTENT,
	entryHubHref,
	searchParam,
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
	searchParams: Promise<{ intent?: string; project?: string | string[] }>;
}) {
	const session = await getSession();
	if (session?.user) {
		const { intent, project } = await searchParams;
		redirect(
			intent === CHECKPOINT_INTENT
				? entryHubHref(searchParam(project))
				: "/hub",
		);
	}
	return <RegistrationClient />;
}
