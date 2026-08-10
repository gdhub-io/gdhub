"use client";

import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import { signOut, useSession } from "next-auth/react";
import styles from "./style.module.scss";

/**
 * Way out of a half-finished session.
 *
 * Onboarding and an invite both put an authenticated user on a page with no
 * navigation, so somebody who followed a magic link into the wrong account had
 * no way back to the sign-in screen. `callbackUrl` is explicit because the
 * middleware sends anyone without `onboardingDone` straight back to onboarding —
 * without it the redirect after sign-out would land right where it started.
 *
 * Renders nothing when there is no session, which is what keeps it off the
 * sign-in and registration screens.
 */
export function AuthLogout() {
	const { t } = useTranslate();
	const { status } = useSession();

	if (status !== "authenticated") return null;

	return (
		<div className={styles.logout}>
			<Button type="text" onClick={() => signOut({ callbackUrl: "/signin" })}>
				{t("auth.logOut", "Log out")}
			</Button>
		</div>
	);
}
