import type { Metadata } from "next";
import {
	entryProjectHref,
	searchParam,
} from "@/components/checkpoints/entry/hrefs";
import { requireSession } from "@/helpers/require-session";
import { ProjectClient } from "./ProjectClient";

export const metadata: Metadata = {
	title: "Head for a checkpoint",
	robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ project?: string | string[] }> };

export default async function CheckpointEntryProjectPage({
	searchParams,
}: Props) {
	const projectSlug = searchParam((await searchParams).project);
	await requireSession(entryProjectHref(projectSlug));
	return <ProjectClient projectSlug={projectSlug} />;
}
