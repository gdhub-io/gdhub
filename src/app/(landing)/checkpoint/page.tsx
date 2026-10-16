import type { Metadata } from "next";
import HeroImage from "@/assets/images/checkpoint/checkpoint-hero.png";
import {
	type FeaturedCurator,
	getFeaturedCurators,
} from "@/repositories/checkpoint-curators";
import { prisma } from "@/services/prisma";
import { CheckpointClient } from "./CheckpointClient";

const TITLE = "Checkpoint — 28 days closer to release";
const DESCRIPTION =
	"A repeatable 28-day program for game developers. Agree a realistic goal with a curator, " +
	"work in four weekly sprints, and leave with a verdict you can build the next cycle on.";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const OG_IMAGE =
	`${APP_URL}/api/og?t=${encodeURIComponent("Checkpoint")}` +
	`&st=${encodeURIComponent("28 days closer to release")}` +
	`&img=${encodeURIComponent(APP_URL + HeroImage.src)}`;

export const metadata: Metadata = {
	title: { absolute: TITLE },
	description: DESCRIPTION,
	// Checkpoint is not launched yet: reachable by URL, kept out of search.
	robots: { index: false, follow: false },
	alternates: { canonical: "/checkpoint" },
	openGraph: {
		type: "website",
		url: "/checkpoint",
		title: TITLE,
		description: DESCRIPTION,
		images: [
			{
				url: OG_IMAGE,
				width: 1200,
				height: 360,
				alt: "Checkpoint — a 28-day program for game developers",
			},
		],
	},
};

export const revalidate = 360;

export default async function CheckpointPage() {
	let curators: FeaturedCurator[] = [];

	// Has to render without a database; the curator section drops out when empty.
	if (await prisma.$isHealthy()) {
		try {
			curators = await getFeaturedCurators();
		} catch (error) {
			console.error(error);
		}
	}

	return <CheckpointClient curators={curators} />;
}
