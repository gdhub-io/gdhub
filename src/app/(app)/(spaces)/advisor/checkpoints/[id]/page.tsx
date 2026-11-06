import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CuratorReview } from "@/components/checkpoints/CuratorReview";
import { AdvisorSpace } from "@/components/spaces/AdvisorSpace";
import { pathTabOf } from "@/lib/checkpoints/hrefs";
import {
	curatorKindOf,
	currentSessionIndex,
} from "@/repositories/checkpoints/review";

export const metadata: Metadata = {
	title: "Path to Checkpoint",
	robots: { index: false, follow: false },
};

/** The curator's Path to Checkpoint: the author's page, opened on the call under way. */
export default async function AdvisorCheckpointPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ tab?: string }>;
}) {
	const [{ id }, { tab }] = await Promise.all([params, searchParams]);
	const [kind, index] = await Promise.all([
		curatorKindOf(id),
		currentSessionIndex(id),
	]);
	if (!kind) notFound();

	return (
		<AdvisorSpace>
			<CuratorReview
				kind={kind}
				checkpointId={id}
				index={index}
				tab={pathTabOf(tab)}
				backHref="/advisor/checkpoints"
			/>
		</AdvisorSpace>
	);
}
