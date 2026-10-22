"use client";

import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { CHECKPOINT_ENTRY_HREF } from "@/components/checkpoints/entry/hrefs";
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
	const { status } = useSession();
	const pathname = usePathname();

	// The way into a checkpoint puts it in its own top row, with the content.
	if (status !== "authenticated" || pathname?.startsWith(CHECKPOINT_ENTRY_HREF))
		return null;

	return (
		<div className={styles.logout}>
			<LogOutButton />
		</div>
	);
}

export function LogOutButton() {
	const { t } = useTranslate();

	return (
		<Button type="text" onClick={() => signOut({ callbackUrl: "/signin" })}>
			{t("auth.logOut", "Log out")}
		</Button>
	);
}
