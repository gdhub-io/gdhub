import type { Metadata } from "next";
import type { ReactNode } from "react";

// Legal documents stay out of search results; links to them still work.
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default function LegalLayout({ children }: { children: ReactNode }) {
	return children;
}
