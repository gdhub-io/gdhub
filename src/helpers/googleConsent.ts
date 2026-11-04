import Cookies from "js-cookie";

/** The visitor has answered the banner, for the consent version below. */
export const CONSENT_DECIDED_KEY = "cookie_consent_is_true";
/** Analytics consent. The name predates the marketing split; existing cookies keep it. */
export const GOOGLE_CONSENT_COOKIE_KEY = "google_consent_is_true";
export const MARKETING_CONSENT_COOKIE_KEY = "marketing_consent_is_true";
const CONSENT_VERSION_KEY = "cookie_consent_version";
// 2: marketing split from analytics. A yes given under version 1 never covered advertising, so everyone is asked again.
const CONSENT_VERSION = "2";
const EXPIRES_DAYS = 365;

export const hasGoogleConsent = (): boolean =>
	Cookies.get(GOOGLE_CONSENT_COOKIE_KEY) === "true";

export const hasMarketingConsent = (): boolean =>
	Cookies.get(MARKETING_CONSENT_COOKIE_KEY) === "true";

export const consentDecided = (): boolean =>
	Cookies.get(CONSENT_DECIDED_KEY) === "true" &&
	Cookies.get(CONSENT_VERSION_KEY) === CONSENT_VERSION;

export const saveConsent = (choice: {
	analytics: boolean;
	marketing: boolean;
}): void => {
	const options = { expires: EXPIRES_DAYS };
	Cookies.set(CONSENT_DECIDED_KEY, "true", options);
	Cookies.set(CONSENT_VERSION_KEY, CONSENT_VERSION, options);
	Cookies.set(GOOGLE_CONSENT_COOKIE_KEY, String(choice.analytics), options);
	Cookies.set(MARKETING_CONSENT_COOKIE_KEY, String(choice.marketing), options);
};

/** Google Consent Mode v2 signals for the stored choice. */
export const consentModeState = () => {
	const analytics = hasGoogleConsent() ? "granted" : "denied";
	const marketing = hasMarketingConsent() ? "granted" : "denied";
	return {
		analytics_storage: analytics,
		ad_storage: marketing,
		ad_user_data: marketing,
		ad_personalization: marketing,
	};
};
