import type { Metadata } from "next";
import { AboutClient } from "./AboutClient";

const TITLE = "About us";
const DESCRIPTION =
	"Game Developers Hub is a community of game industry professionals who form teams to make new games.";

export const metadata: Metadata = {
	title: TITLE,
	description: DESCRIPTION,
	alternates: { canonical: "/about" },
	openGraph: {
		type: "website",
		url: "/about",
		title: TITLE,
		description: DESCRIPTION,
	},
};

export default function AboutPage() {
	return <AboutClient />;
}
