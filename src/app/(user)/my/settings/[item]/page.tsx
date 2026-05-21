import type { Metadata } from "next";
import { SettingsItemClient } from "./SettingsItemClient";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ item: string }>;
}): Promise<Metadata> {
	const { item } = await params;
	const titles: Record<string, string> = {
		general: "General",
		specialities: "Specialities",
		mentorship: "Mentorship",
		resources: "Resources",
		connections: "Connections",
		interests: "Interests",
		danger: "Danger Zone",
	};
	const title = titles[item] ?? "Settings";
	return {
		title: `${title} · Settings`,
		alternates: { canonical: `/my/settings/${item}` },
		robots: { index: false, follow: false },
	};
}

export default function SettingsItemPage() {
	return <SettingsItemClient />;
}
