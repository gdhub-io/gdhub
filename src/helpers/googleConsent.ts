import Cookies from "js-cookie";

// Cookie keys
export const GOOGLE_CONSENT_COOKIE_KEY = "google_consent_is_true";

/**
 * Check if user has given consent to Google services
 */
export const hasGoogleConsent = (): boolean => {
	return Cookies.get(GOOGLE_CONSENT_COOKIE_KEY) === "true";
};

/**
 * Set Google consent
 */
export const setGoogleConsent = (consent: boolean): void => {
	Cookies.set(GOOGLE_CONSENT_COOKIE_KEY, consent ? "true" : "false", {
		expires: 365, // 1 year
	});
};
