import type { Metadata } from "next";
import {
	entryHubHref,
	searchParam,
} from "@/components/checkpoints/entry/hrefs";
import { requireSession } from "@/helpers/require-session";
import { HubClient } from "./HubClient";

export const metadata: Metadata = {
	title: "Head for a checkpoint",
	robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ project?: string | string[] }> };

// In the (auth) group for AuthShell's light, chrome-less look; signed in only.
export default async function CheckpointEntryPage({ searchParams }: Props) {
	const projectSlug = searchParam((await searchParams).project);
	await requireSession(entryHubHref(projectSlug));
	return <HubClient projectSlug={projectSlug} />;
}
