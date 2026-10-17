"use client";

import {
	IconAdjustmentsHorizontal,
	IconArrowLeft,
	IconCookie,
} from "@tabler/icons-react";
import { T } from "@tolgee/react";
import { Button, Switch } from "antd";
import Cookies from "js-cookie";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconTile } from "@/components/ui";
import { GTM_ID } from "@/helpers/gtm";
import styles from "./style.module.scss";

const USER_CONSENT_COOKIE_KEY = "cookie_consent_is_true";
const GOOGLE_CONSENT_COOKIE_KEY = "google_consent_is_true";
const USER_CONSENT_COOKIE_EXPIRE_DATE = 365;

export const CookieConsent = () => {
	// Starts as "already consented" so the banner never flashes before the cookie
	// is read on mount.
	const [cookieConsentIsTrue, setCookieConsentIsTrue] = useState(true);
	const [showPreferences, setShowPreferences] = useState(false);
	const [googleConsent, setGoogleConsent] = useState(true);

	useEffect(() => {
		setCookieConsentIsTrue(Cookies.get(USER_CONSENT_COOKIE_KEY) === "true");

		const storedGoogleConsent = Cookies.get(GOOGLE_CONSENT_COOKIE_KEY);
		setGoogleConsent(
			storedGoogleConsent === undefined ? true : storedGoogleConsent === "true",
		);
	}, []);

	useEffect(() => {
		// Update GTM iframe in noscript container
		if (typeof document !== "undefined" && typeof window !== "undefined") {
			const container = document.getElementById("gtm-noscript-container");
			if (container && googleConsent && process.env.NODE_ENV === "production") {
				container.innerHTML = `
					<iframe
						src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
						height="0"
						width="0"
						style="display:none;visibility:hidden"
					></iframe>
				`;
			} else if (container) {
				container.innerHTML = "";
			}
		}
	}, [googleConsent]);

	const persist = (analytics: boolean) => {
		Cookies.set(USER_CONSENT_COOKIE_KEY, "true", {
			expires: USER_CONSENT_COOKIE_EXPIRE_DATE,
		});
		Cookies.set(GOOGLE_CONSENT_COOKIE_KEY, analytics ? "true" : "false", {
			expires: USER_CONSENT_COOKIE_EXPIRE_DATE,
		});
		setGoogleConsent(analytics);
		setCookieConsentIsTrue(true);

		// Only a granted consent needs a reload — it is what lets the Google Tag
		// Manager script load for the current page.
		if (analytics && typeof window !== "undefined") {
			window.location.reload();
		}
	};

	if (cookieConsentIsTrue) {
		return null;
	}

	return (
		<aside
			className={styles.root}
			aria-label="Cookie consent"
			// The banner sits above the page, so it is announced without stealing
			// focus from whatever the user is already doing.
			aria-live="polite"
		>
			<div className={styles.head}>
				<IconTile
					icon={showPreferences ? IconAdjustmentsHorizontal : IconCookie}
					size="sm"
				/>
				<div className={styles.text}>
					<p className={styles.title}>
						{showPreferences ? (
							<T keyName="popup.cookie.preferences">Cookie preferences</T>
						) : (
							<T keyName="popup.cookie.title">Cookies on GDHub</T>
						)}
					</p>
					<p className={styles.description}>
						{showPreferences ? (
							<T keyName="popup.cookie.preferencesText">
								Choose what GDHub may store on this device. You can change this
								later from the Cookie policy page.
							</T>
						) : (
							<T keyName="popup.cookie.description">
								We use cookies to keep you signed in and to understand how the
								platform is used. Analytics stay off until you allow them.
							</T>
						)}
					</p>
				</div>
			</div>

			{showPreferences && (
				<div className={styles.categories}>
					<div className={styles.category}>
						<div className={styles.text}>
							<p className={styles.categoryTitle}>
								<T keyName="popup.cookie.essential">Essential</T>
								<span className={styles.chip}>
									<T keyName="popup.cookie.required">Required</T>
								</span>
							</p>
							<p className={styles.categoryDescription}>
								<T keyName="popup.cookie.essentialText">
									Sign-in, security and your session.
								</T>
							</p>
						</div>
						<Switch checked disabled />
					</div>

					<div className={styles.category}>
						<div className={styles.text}>
							<p className={styles.categoryTitle}>
								<T keyName="popup.cookie.analytics">Analytics</T>
							</p>
							<p className={styles.categoryDescription}>
								<T keyName="popup.cookie.analyticsText">
									Google Tag Manager — helps us see which parts of GDHub get
									used.
								</T>
							</p>
						</div>
						<Switch checked={googleConsent} onChange={setGoogleConsent} />
					</div>
				</div>
			)}

			{/* Both choices carry the same weight — a quieter refusal would be a dark
			    pattern, and consent given that way is not consent. */}
			<div className={styles.actions}>
				{showPreferences ? (
					<Button onClick={() => persist(googleConsent)}>
						<T keyName="popup.cookie.save">Save selection</T>
					</Button>
				) : (
					<Button onClick={() => persist(false)}>
						<T keyName="popup.cookie.essentialOnly">Essential only</T>
					</Button>
				)}
				<Button type="primary" onClick={() => persist(true)}>
					<T keyName="popup.cookie.acceptAll">Accept all</T>
				</Button>
			</div>

			<div className={styles.footer}>
				{showPreferences ? (
					<button
						type="button"
						className={styles.link}
						onClick={() => setShowPreferences(false)}
					>
						<IconArrowLeft size={14} stroke={2} />
						<T keyName="popup.cookie.back">Back</T>
					</button>
				) : (
					<button
						type="button"
						className={styles.link}
						onClick={() => setShowPreferences(true)}
					>
						<IconAdjustmentsHorizontal size={14} stroke={2} />
						<T keyName="popup.cookie.manage">Manage cookies</T>
					</button>
				)}
				<Link href="/legal/cookie-policy" className={styles.policyLink}>
					<T keyName="popup.cookie.policy">Cookie policy</T>
				</Link>
			</div>
		</aside>
	);
};
