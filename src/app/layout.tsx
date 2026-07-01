import "@/styles/globals.scss";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CookieConsent } from "@/components/CookieConsent";
import { GoogleTagManager } from "@/components/GoogleTagManager";
import { setupDayjs } from "@/config/dayjs-setup";
import { Providers } from "./providers";

setupDayjs();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
	metadataBase: new URL(APP_URL),
	title: {
		default: "Game Developers Hub",
		template: "%s · GDHub",
	},
	description:
		"Web service & community for everyone who wants to create or participate in indie games",
	icons: { icon: "/favicon.svg" },
	openGraph: {
		type: "website",
		locale: "en_US",
		siteName: "Game Developers Hub",
		url: APP_URL,
	},
	twitter: {
		card: "summary_large_image",
		site: "@gamedev_hub",
	},
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
			<body suppressHydrationWarning>
				{process.env.NODE_ENV === "production" && (
					<noscript
						// biome-ignore lint/security/noDangerouslySetInnerHtml: GTM noscript container, filled on consent
						dangerouslySetInnerHTML={{
							__html: `<div id="gtm-noscript-container"></div>`,
						}}
					/>
				)}
				<GoogleTagManager />
				<Providers>
					{children}
					<CookieConsent />
				</Providers>
			</body>
		</html>
	);
}
