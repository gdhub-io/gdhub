declare global {
	interface Window {
		dataLayer: any[];
	}
}

export const GTM_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || "";

export const pageview = (url: string) => {
	if (typeof window !== "undefined" && Array.isArray(window.dataLayer)) {
		window.dataLayer.push({
			event: "page_view",
			page: url,
			timestamp: new Date().toISOString(),
		});
	}
};

export const gtmEventTrigger = (event: string, data: Record<string, any>) => {
	if (typeof window !== "undefined" && Array.isArray(window.dataLayer)) {
		window.dataLayer.push({
			event,
			[event]: data,
			timestamp: new Date().toISOString(),
		});
	}
};
