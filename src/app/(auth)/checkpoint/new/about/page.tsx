import type { Metadata } from "next";
import {
	entryAboutHref,
	projectParam,
} from "@/components/checkpoints/entry/hrefs";
import { requireSession } from "@/helpers/require-session";
import { AboutClient } from "./AboutClient";

export const metadata: Metadata = {
	title: "Head for a checkpoint",
	robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ project?: string | string[] }> };

export default async function CheckpointEntryAboutPage({
	searchParams,
}: Props) {
	const projectSlug = projectParam((await searchParams).project);
	await requireSession(entryAboutHref(projectSlug));
	return <AboutClient projectSlug={projectSlug} />;
}
