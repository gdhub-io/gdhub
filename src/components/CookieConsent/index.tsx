import { T } from "@tolgee/react";
import { Button, Checkbox, Flex, Grid, Space, Typography } from "antd";
import Cookies from "js-cookie";
import Link from "next/link";
import { type MouseEvent, useEffect, useState } from "react";
import { GTM_ID } from "@/helpers/gtm";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

const USER_CONSENT_COOKIE_KEY = "cookie_consent_is_true";
const GOOGLE_CONSENT_COOKIE_KEY = "google_consent_is_true";
const USER_CONSENT_COOKIE_EXPIRE_DATE = 365;

export const CookieConsent = () => {
	const screens = Grid.useBreakpoint();
	const [cookieConsentIsTrue, setCookieConsentIsTrue] = useState(true);
	const [showDetails, setShowDetails] = useState(false);
	const [googleConsent, setGoogleConsent] = useState(true);

	useEffect(() => {
		const consentIsTrue = Cookies.get(USER_CONSENT_COOKIE_KEY) === "true";
		setCookieConsentIsTrue(consentIsTrue);

		if (!Cookies.get(GOOGLE_CONSENT_COOKIE_KEY)) {
			setGoogleConsent(true);
		} else {
			const googleConsentIsTrue =
				Cookies.get(GOOGLE_CONSENT_COOKIE_KEY) === "true";
			setGoogleConsent(googleConsentIsTrue || false);
		}
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

	const onClick = (e: MouseEvent<any>) => {
		e.preventDefault();

		if (!cookieConsentIsTrue) {
			Cookies.set(USER_CONSENT_COOKIE_KEY, "true", {
				expires: USER_CONSENT_COOKIE_EXPIRE_DATE,
			});
			setCookieConsentIsTrue(true);

			Cookies.set(GOOGLE_CONSENT_COOKIE_KEY, googleConsent ? "true" : "false", {
				expires: USER_CONSENT_COOKIE_EXPIRE_DATE,
			});
			setGoogleConsent(googleConsent);

			// Reload the page if Google consent has changed and was given
			// This allows the Google Tag Manager script to load
			if (googleConsent && typeof window !== "undefined") {
				window.location.reload();
			}
		}
	};

	const toggleDetails = (e: MouseEvent<any>) => {
		e.preventDefault();
		setShowDetails(!showDetails);
	};

	const handleGoogleConsentChange = (e: any) => {
		setGoogleConsent(e.target.checked);
	};

	if (cookieConsentIsTrue) {
		return null;
	}

	return (
		<div className={styles.cookieContainer}>
			<Flex gap={24} align="flex-start" vertical>
				<Flex gap={32} align="center" vertical={screens.lg ? false : true}>
					<Text>
						<T keyName="popup.cookie.text">
							This website uses cookies to improve the user experience. By using
							our website you agree to the use of all cookies in accordance with
							our Cookie policy.
						</T>
					</Text>

					<Space size="large" wrap={screens.xl ? false : true}>
						<Button onClick={toggleDetails}>
							<T keyName="popup.cookie.manage">Manage cookies</T>
						</Button>
						<Link href="/cookie-policy">
							<Button>
								<T keyName="popup.cookie.more">Read more</T>
							</Button>
						</Link>
						<Button type="primary" onClick={onClick}>
							<T keyName="popup.cookie.accept">I accept</T>
						</Button>
					</Space>
				</Flex>

				{showDetails && (
					<div className={styles.detailsContainer}>
						<Title level={5}>
							<T keyName="popup.cookie.preferences">Cookie Preferences</T>
						</Title>
						<Checkbox
							checked={googleConsent}
							onChange={handleGoogleConsentChange}
						>
							<Text>
								<T keyName="popup.cookie.google">
									Google services (Google Tag Manager) - Allow us to analyze
									website traffic and usage to improve your experience
								</T>
							</Text>
						</Checkbox>
					</div>
				)}
			</Flex>
		</div>
	);
};
