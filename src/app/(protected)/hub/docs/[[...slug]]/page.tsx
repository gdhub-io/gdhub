import type { Metadata } from "next";
import { auth } from "@/auth";
import type { AvailableLocales } from "@/config/locale";
import { getPages } from "@/services/notion";
import { tolgeeService } from "@/services/tolgee";
import { HubDocsClient } from "./HubDocsClient";

type Params = { slug?: string[] };

export async function generateMetadata({
	params,
}: {
	params: Promise<Params>;
}): Promise<Metadata> {
	const { slug } = await params;
	const canonical = `/hub/docs${slug?.length ? `/${slug.join("/")}` : ""}`;
	return {
		title: "Documentation",
		robots: { index: false, follow: false },
		alternates: { canonical },
		openGraph: { type: "website", url: canonical, title: "Documentation" },
	};
}

export default async function HubDocsPage() {
	const locale = tolgeeService.getLanguage() as AvailableLocales;
	const session: any = await auth();
	const pages: any = await getPages({
		roles: session?.user?.roles,
		locale: session?.user?.lang || locale,
	});

	return <HubDocsClient pages={pages} />;
}
