import { auth } from "@/auth";
import type { AvailableLocales } from "@/config/locale";
import { getPages } from "@/services/notion";
import { tolgeeService } from "@/services/tolgee";
import { HubDocsClient } from "./HubDocsClient";

export default async function HubDocsPage() {
	const locale = tolgeeService.getLanguage() as AvailableLocales;
	const session: any = await auth();
	const pages: any = await getPages({
		roles: session?.user?.roles,
		locale: session?.user?.lang || locale,
	});

	return <HubDocsClient pages={pages} />;
}
