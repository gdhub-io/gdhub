import type { Metadata } from "next";
import { PulseCard } from "@/components/checkpoints/PulseCard";
import { pulseView } from "@/repositories/checkpoints/pulse";

export const metadata: Metadata = {
	title: "Pulse",
	robots: { index: false, follow: false },
};

/** Read-only on purpose: mail scanners open the link before the person does. */
export default async function PulsePage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	const view = await pulseView(token);

	return <PulseCard view={view} token={token} />;
}
