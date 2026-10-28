import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CuratorReview } from "@/components/checkpoints/CuratorReview";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { pathTabOf, sessionOfSprintParam } from "@/lib/checkpoint-hrefs";
import { checkpointIdByNumber } from "@/repositories/checkpoint-number";
import {
	curatorKindOf,
	currentSessionIndex,
} from "@/repositories/checkpoint-review";

export const metadata: Metadata = {
	title: "Path to Checkpoint",
	robots: { index: false, follow: false },
};

/** Path to Checkpoint N: one page for the checkpoint's work, on a sprint or the one under way. */
export default async function CheckpointPathPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string; cp: string }>;
	searchParams: Promise<{ sprint?: string; tab?: string }>;
}) {
	const [{ slug, cp }, { sprint, tab }] = await Promise.all([
		params,
		searchParams,
	]);
	const number = Number(/^cp(\d+)$/.exec(cp)?.[1]);
	if (!Number.isInteger(number) || number < 1) notFound();

	const index = sessionOfSprintParam(sprint);
	const checkpointId = await checkpointIdByNumber(slug, number);
	if (!checkpointId) notFound();
	const kind = await curatorKindOf(checkpointId);
	if (!kind) notFound();
	// A pro's page is a call, so it needs one; the AI's review opens on its own moment.
	const session =
		index ??
		(kind === CheckpointCuratorKind.AI
			? undefined
			: await currentSessionIndex(checkpointId));

	return (
		<ProjectSpace>
			<CuratorReview
				kind={kind}
				checkpointId={checkpointId}
				index={session}
				tab={pathTabOf(tab)}
				backHref={`/user/project/${slug}/workflow`}
			/>
		</ProjectSpace>
	);
}
