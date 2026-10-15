import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CuratorReview } from "@/components/checkpoints/CuratorReview";
import { AdvisorSpace } from "@/components/spaces/AdvisorSpace";
import { SESSIONS_PER_CHECKPOINT } from "@/config/checkpoint";
import { curatorKindOf } from "@/repositories/checkpoint-review";

export const metadata: Metadata = {
	title: "Curator's Review",
	robots: { index: false, follow: false },
};

export default async function AdvisorReviewPage({
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
	const kind = await curatorKindOf(id);
	if (!kind) notFound();

	return (
		<AdvisorSpace>
			<CuratorReview
				kind={kind}
				checkpointId={id}
				index={session}
				backHref="/advisor/calendar"
			/>
		</AdvisorSpace>
	);
}
