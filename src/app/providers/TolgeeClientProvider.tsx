"use client";

import { TolgeeProvider } from "@tolgee/react";
import type { ReactNode } from "react";
import { defaultLocale } from "@/config/locale";
import enLocale from "@/i18n/en.json";
import { tolgeeService } from "@/services/tolgee";

/**
 * `ssr` makes Tolgee render translations during the server pass instead of
 * showing `fallback` until the client loads them. Without it the provider
 * suspends above every page, so the HTML shell is flushed before the page runs
 * — which sends a 200 and leaves `notFound()` unable to set a 404 status, and
 * keeps translated text out of the server-rendered markup.
 */
export function TolgeeClientProvider({ children }: { children: ReactNode }) {
	return (
		<TolgeeProvider
			tolgee={tolgeeService}
			fallback={null}
			ssr={{
				language: defaultLocale,
				staticData: { en: enLocale },
			}}
		>
			{children}
		</TolgeeProvider>
	);
}
