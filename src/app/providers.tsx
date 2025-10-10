"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TolgeeProvider } from "@tolgee/react";
import { SessionProvider } from "next-auth/react";
import { DefaultSeo } from "next-seo";
import NextNProgress from "nextjs-progressbar";
import type React from "react";
import { useState } from "react";
import { CookieConsent } from "@/components/CookieConsent";
import LoadingScreen from "@/components/LoadingScreen";
import type { AvailableLocales } from "@/config/locale";
import SEOSettings from "@/config/seo";
import { useAuthErrorHandler } from "@/hooks/useAuthErrorHandler";
import { tolgeeService } from "@/services/tolgee";

function AuthErrorHandler() {
	useAuthErrorHandler();
	return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
	const [loading] = useState(false);
	return (
		<TolgeeProvider tolgee={tolgeeService} fallback="Loading...">
			<QueryClientProvider client={new QueryClient()}>
				<SessionProvider>
					<AuthErrorHandler />
					<DefaultSeo {...SEOSettings["en" as AvailableLocales]} />
					{children}
				</SessionProvider>
				<CookieConsent />
				<LoadingScreen visible={loading} />
				{process.env.NODE_ENV === "development" && (
					<ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
				)}
			</QueryClientProvider>
			<NextNProgress
				color="#F15541"
				startPosition={0.3}
				stopDelayMs={200}
				height={3}
				options={{ showSpinner: false }}
			/>
		</TolgeeProvider>
	);
}
