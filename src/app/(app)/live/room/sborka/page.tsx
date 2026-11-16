import type { Metadata } from "next";
import { SborkaStudio } from "@/components/live/Sborka";

// Reached by its URL only: nothing on the platform links here (GDHUB-207).
export const metadata: Metadata = {
	title: "Sborka",
	robots: { index: false, follow: false },
};

export default function SborkaPage() {
	return (
		<main className="container">
			<SborkaStudio />
		</main>
	);
}
