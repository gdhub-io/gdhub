import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CallRoom } from "@/components/checkpoints/CallRoom";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import { SESSIONS_PER_CHECKPOINT } from "@/config/checkpoint";
import { checkpointIdByNumber } from "@/repositories/checkpoint-number";

export const metadata: Metadata = {
	title: "Call",
	robots: { index: false, follow: false },
};

export default async function ProjectCallPage({
	params,
}: {
	params: Promise<{ slug: string; cp: string; index: string }>;
}) {
	const { slug, cp, index } = await params;
	const number = Number(/^cp(\d+)$/.exec(cp)?.[1]);
	const session = Number(index);
	if (
		!Number.isInteger(number) ||
		number < 1 ||
		!Number.isInteger(session) ||
		session < 1 ||
		session > SESSIONS_PER_CHECKPOINT
	) {
		notFound();
	}

	const checkpointId = await checkpointIdByNumber(slug, number);
	if (!checkpointId) notFound();

	return (
		<ProjectSpace>
			<CallRoom
				checkpointId={checkpointId}
				index={session}
				backHref={`/user/project/${slug}/workflow`}
			/>
		</ProjectSpace>
	);
}
