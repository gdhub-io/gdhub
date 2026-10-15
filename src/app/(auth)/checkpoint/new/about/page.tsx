import type { Metadata } from "next";
import { requireSession } from "@/helpers/require-session";
import { AboutClient } from "./AboutClient";

export const metadata: Metadata = {
	title: "Head for a checkpoint",
	robots: { index: false, follow: false },
};

export default async function CheckpointEntryAboutPage() {
	await requireSession("/checkpoint/new/about");
	return <AboutClient />;
}
