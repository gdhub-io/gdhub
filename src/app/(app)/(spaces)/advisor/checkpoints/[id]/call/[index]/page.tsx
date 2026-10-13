import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CallRoom } from "@/components/checkpoints/CallRoom";
import { AdvisorSpace } from "@/components/spaces/AdvisorSpace";
import { SESSIONS_PER_CHECKPOINT } from "@/config/checkpoint";

export const metadata: Metadata = {
	title: "Call",
	robots: { index: false, follow: false },
};

export default async function AdvisorCallPage({
	params,
}: {
	params: Promise<{ id: string; index: string }>;
}) {
	const { id, index } = await params;
	const session = Number(index);
	if (
		!Number.isInteger(session) ||
		session < 1 ||
		session > SESSIONS_PER_CHECKPOINT
	) {
		notFound();
	}

	return (
		<AdvisorSpace>
			<CallRoom
				checkpointId={id}
				index={session}
				backHref="/advisor/calendar"
			/>
		</AdvisorSpace>
	);
}
