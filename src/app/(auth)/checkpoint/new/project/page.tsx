import type { Metadata } from "next";
import { requireSession } from "@/helpers/require-session";
import { ProjectClient } from "./ProjectClient";

export const metadata: Metadata = {
	title: "Head for a checkpoint",
	robots: { index: false, follow: false },
};

export default async function CheckpointEntryProjectPage() {
	await requireSession("/checkpoint/new/project");
	return <ProjectClient />;
}
