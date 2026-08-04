import "@/styles/globals.scss";
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { CookieConsent } from "@/components/CookieConsent";
import { GoogleTagManager } from "@/components/GoogleTagManager";
import { setupDayjs } from "@/config/dayjs-setup";
import { designCssVariables } from "@/config/design/css";
import { fontClassName } from "@/config/design/fonts";
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
			{/* The `--gd-*` design tokens are emitted here so SCSS modules and the antd
			    themes read the same values; an inverse band re-declares them on its
			    own subtree. */}
			<body
				className={fontClassName}
				style={designCssVariables() as CSSProperties}
				suppressHydrationWarning
			>
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
