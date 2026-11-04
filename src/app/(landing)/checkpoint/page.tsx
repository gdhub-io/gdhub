import type { Metadata } from "next";
import { EXPERT_CHECKPOINT_OPEN } from "@/config/checkpoint";
import { getFeaturedCurators } from "@/repositories/checkpoints/curator-catalog";
import { prisma } from "@/services/prisma";
import type { FeaturedCurator } from "@/types/checkpoints";
import { CheckpointClient } from "./CheckpointClient";

const TITLE = "Checkpoint — 28 days closer to release";
const DESCRIPTION =
	"A repeatable 28-day program for game developers. Agree a realistic goal with a curator, " +
	"work in four weekly sprints, and leave with a verdict you can build the next cycle on.";

export const metadata: Metadata = {
	title: { absolute: TITLE },
	description: DESCRIPTION,
	alternates: { canonical: "/checkpoint" },
	openGraph: {
		type: "website",
		url: "/checkpoint",
		title: TITLE,
		description: DESCRIPTION,
	},
};

export const revalidate = 360;

export default async function CheckpointPage() {
	let curators: FeaturedCurator[] = [];

	// Has to render without a database; the curator section drops out when empty.
	if (EXPERT_CHECKPOINT_OPEN && (await prisma.$isHealthy())) {
		try {
			curators = await getFeaturedCurators();
		} catch (error) {
			console.error(error);
		}
	}

	return <CheckpointClient curators={curators} />;
}
