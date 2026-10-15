import type { Metadata } from "next";
import { requireSession } from "@/helpers/require-session";
import { HubClient } from "./HubClient";

export const metadata: Metadata = {
	title: "Head for a checkpoint",
	robots: { index: false, follow: false },
};

// In the (auth) group for AuthShell's light, chrome-less look; signed in only.
export default async function CheckpointEntryPage() {
	await requireSession("/checkpoint/new");
	return <HubClient />;
}
