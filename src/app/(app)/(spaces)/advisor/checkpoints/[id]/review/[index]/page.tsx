import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CuratorReview } from "@/components/checkpoints/CuratorReview";
import { AdvisorSpace } from "@/components/spaces/AdvisorSpace";
import { SESSIONS_PER_CHECKPOINT } from "@/config/checkpoint";
import { pathTabOf } from "@/lib/checkpoint-hrefs";
import { curatorKindOf } from "@/repositories/checkpoint-review";

export const metadata: Metadata = {
	title: "Curator's Review",
	robots: { index: false, follow: false },
};

export default async function AdvisorReviewPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string; index: string }>;
	searchParams: Promise<{ tab?: string }>;
}) {
	const [{ id, index }, { tab }] = await Promise.all([params, searchParams]);
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
				tab={pathTabOf(tab)}
				backHref="/advisor/calendar"
			/>
		</AdvisorSpace>
	);
}
