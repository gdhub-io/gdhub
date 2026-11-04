import Cookies from "js-cookie";
import { beforeEach, describe, expect, it } from "vitest";
import {
	consentDecided,
	consentModeState,
	hasGoogleConsent,
	hasMarketingConsent,
	saveConsent,
} from "@/helpers/googleConsent";

const jar = new Map<string, string>();
Cookies.get = ((key: string) => jar.get(key)) as typeof Cookies.get;
Cookies.set = ((key: string, value: string) => {
	jar.set(key, value);
	return value;
}) as typeof Cookies.set;

beforeEach(() => jar.clear());

describe("cookie consent", () => {
	it("starts undecided, with everything denied", () => {
		expect(consentDecided()).toBe(false);
		expect(consentModeState()).toEqual({
			analytics_storage: "denied",
			ad_storage: "denied",
			ad_user_data: "denied",
			ad_personalization: "denied",
		});
	});

	// Analytics alone must not let an advertising tag fire.
	it("grants analytics without the ad signals", () => {
		saveConsent({ analytics: true, marketing: false });

		expect(consentDecided()).toBe(true);
		expect(hasGoogleConsent()).toBe(true);
		expect(hasMarketingConsent()).toBe(false);
		expect(consentModeState()).toEqual({
			analytics_storage: "granted",
			ad_storage: "denied",
			ad_user_data: "denied",
			ad_personalization: "denied",
		});
	});

	it("grants every ad signal with marketing", () => {
		saveConsent({ analytics: false, marketing: true });

		expect(consentModeState()).toMatchObject({
			analytics_storage: "denied",
			ad_storage: "granted",
			ad_user_data: "granted",
			ad_personalization: "granted",
		});
	});

	// A yes from the single-switch banner never covered marketing.
	it("asks again a visitor who answered the old banner", () => {
		jar.set("cookie_consent_is_true", "true");
		jar.set("google_consent_is_true", "true");

		expect(consentDecided()).toBe(false);
	});
});
