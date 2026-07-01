"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect, useState } from "react";
import { hasGoogleConsent } from "@/helpers/googleConsent";
import { GTM_ID, pageview } from "@/helpers/gtm";

/**
 * Fires a `page_view` on client-side (SPA) navigations. GTM only auto-tracks
 * the initial full-page load, so route changes have to be pushed manually.
 */
function PageviewTracker() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		const qs = searchParams?.toString();
		pageview(qs ? `${pathname}?${qs}` : pathname);
	}, [pathname, searchParams]);

	return null;
}

/**
 * Loads the Google Tag Manager container. Only injected in production, when a
 * GTM id is configured and the user has given Google consent. Consent is read
 * once on mount — CookieConsent reloads the page after the user accepts, so the
 * script is picked up on the next load.
 */
export function GoogleTagManager() {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		setEnabled(
			process.env.NODE_ENV === "production" && !!GTM_ID && hasGoogleConsent(),
		);
	}, []);

	if (!enabled) return null;

	return (
		<>
			{/* biome-ignore lint/correctness/useUniqueElementIds: next/script requires a stable singleton id */}
			<Script
				id="gtm-base"
				strategy="afterInteractive"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: GTM loader snippet
				dangerouslySetInnerHTML={{
					__html: `
						(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
						new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
						j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
						'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
						})(window,document,'script','dataLayer','${GTM_ID}');
					`,
				}}
			/>
			<Suspense fallback={null}>
				<PageviewTracker />
			</Suspense>
		</>
	);
}
