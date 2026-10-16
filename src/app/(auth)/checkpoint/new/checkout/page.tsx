import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckpointPurchase } from "@/components/CheckpointPurchase";
import {
	checkoutHref,
	searchParam,
} from "@/components/checkpoints/entry/hrefs";
import { requireSession } from "@/helpers/require-session";
import { isProjectFounder } from "@/repositories/checkpoint-entry";
import { prisma } from "@/services/prisma";

export const metadata: Metadata = {
	title: "Head for a checkpoint",
	robots: { index: false, follow: false },
};

type Props = {
	searchParams: Promise<{
		project?: string | string[];
		step?: string | string[];
	}>;
};

// In the (auth) group for the hub's light shell. Only the project's Founder buys
// its checkpoints; anyone else gets a 404, so the page does not confirm it exists.
export default async function CheckpointCheckoutPage({ searchParams }: Props) {
	const query = await searchParams;
	const slug = searchParam(query.project);
	const step = searchParam(query.step);

	const session = await requireSession(
		slug ? checkoutHref(slug, step) : undefined,
	);
	if (!slug) notFound();

	const project = await prisma.project.findUnique({
		where: { slug },
		select: {
			id: true,
			slug: true,
			name: true,
			team: { select: { id: true } },
		},
	});
	if (!project || !(await isProjectFounder(session.user.id, project.id)))
		notFound();

	return <CheckpointPurchase project={project} />;
}
