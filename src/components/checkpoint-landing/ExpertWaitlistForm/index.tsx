"use client";

import { IconCircleCheck } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, ConfigProvider, Flex, Input, Typography } from "antd";
import { useSession } from "next-auth/react";
import { type CSSProperties, useState } from "react";
import { publicTheme } from "@/config/design";
import { designCssVariables } from "@/config/design/css";
import { WaitlistFeature } from "@/config/prisma-enums";
import { useJoinWaitlist, useWaitlistStatus } from "@/hooks/feature-waitlist";
import styles from "./style.module.scss";

const FEATURE = WaitlistFeature.ExpertCheckpoint;

// The pricing band is dark; a dark field on it went unnoticed, so the controls
// sit on the light palette.
const lightVars = designCssVariables("light", "marketing") as CSSProperties;

/**
 * Frame `o5oi2` (pricing): the expert waitlist inside the expert card. A
 * guest leaves an email; signed in, the account's is shown read-only and sent.
 */
export function ExpertWaitlistForm() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { status, data: session } = useSession();
	const signedIn = status === "authenticated";
	const joinedBefore = useWaitlistStatus(FEATURE, signedIn);
	const join = useJoinWaitlist(FEATURE);
	const [email, setEmail] = useState("");

	if (join.data?.joined || joinedBefore.data?.joined) {
		return (
			<Flex gap={8} align="center" className={styles.done}>
				<IconCircleCheck size={16} />
				{t(
					"checkpointLanding.waitlist.joined",
					"You're on the list — we'll write once it opens",
				)}
			</Flex>
		);
	}

	const submit = () => {
		if (!signedIn && !email.trim()) {
			message.warning(
				t("checkpointLanding.waitlist.emailNeeded", "Enter your email first"),
			);
			return;
		}
		join.mutate(signedIn ? undefined : email.trim(), {
			onError: () =>
				message.error(
					t(
						"checkpointLanding.waitlist.failed",
						"Couldn't add you. Check the email and try again.",
					),
				),
		});
	};

	return (
		<Flex vertical gap={8}>
			<div style={lightVars}>
				<ConfigProvider theme={publicTheme}>
					<Flex gap={8} wrap>
						<Input
							type="email"
							autoComplete="email"
							value={signedIn ? (session.user?.email ?? "") : email}
							readOnly={signedIn}
							onChange={(event) => setEmail(event.target.value)}
							onPressEnter={submit}
							placeholder={t(
								"checkpointLanding.waitlist.placeholder",
								"you@studio.com",
							)}
							aria-label={t("checkpointLanding.waitlist.email", "Email")}
							className={styles.email}
						/>
						<Button
							className={styles.join}
							loading={join.isPending}
							onClick={submit}
						>
							{t("checkpointLanding.waitlist.join", "Join the waitlist")}
						</Button>
					</Flex>
				</ConfigProvider>
			</div>
			<Typography.Text type="secondary" className={styles.fine}>
				{t(
					"checkpointLanding.waitlist.fine",
					"We only write about this, once it opens.",
				)}
			</Typography.Text>
		</Flex>
	);
}
