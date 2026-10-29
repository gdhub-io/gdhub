"use client";

import { IconBrandGoogle } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Form, Input, message, Space, Typography } from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { MagicLinkSent } from "@/components/auth/MagicLinkSent";
import {
	CHECKPOINT_ENTRY_HREF,
	entryRegistrationHref,
} from "@/components/checkpoints/entry/hrefs";
import { gtmEventTrigger, markCheckpointSignIn } from "@/helpers/gtm";
import styles from "./style.module.scss";

const { Paragraph, Title } = Typography;

export function SigninClient() {
	const searchParams = useSearchParams();
	const { t } = useTranslate();
	const [form] = Form.useForm();
	const [loginStep, setLoginStep] = useState(1);
	const [email, setEmail] = useState<string>();
	const [submitting, setSubmitting] = useState<boolean>(false);

	const error = searchParams?.get("error");
	const callbackUrl = searchParams?.get("callbackUrl") || "/hub";
	const toCheckpoint = callbackUrl.startsWith(CHECKPOINT_ENTRY_HREF);

	useEffect(() => {
		if (error === "RefreshTokenExpired") {
			message.error(
				t(
					"refresh_token_expired",
					"Your session has expired. Please sign in again.",
				),
			);
		}

		if (error === "InvalidGrantError") {
			message.error(
				t(
					"invalid_grant_error",
					"Invalid authorization. Please sign in again.",
				),
			);
		}
	}, [error, t]);

	const handleSend = async () => {
		setSubmitting(true);

		const { email } = await form.validateFields();

		try {
			if (toCheckpoint) markCheckpointSignIn("email");
			const response = await signIn("email", {
				email,
				redirect: false,
				callbackUrl,
			});

			setSubmitting(false);
			setEmail(email);

			if (response?.ok) {
				setLoginStep(3);
				gtmEventTrigger("user_login", { provider: "email" });
			}
			if (response?.error) message.error(response?.error);
		} catch {
			message.error(
				t("error_sending_email", "Error sending email. Please try again."),
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className={styles.container}>
			<div className="login-box">
				<div className="login-form">
					<Space orientation="vertical" size={40} style={{ width: "100%" }}>
						{loginStep < 3 && (
							<div>
								<Title style={{ marginBottom: 4 }}>
									{t("signin.title", "Sign in")}
								</Title>
								<Paragraph type="secondary" style={{ margin: 0 }}>
									{t("signin.platformSubtitle", "to the gdhub.io platform")}
								</Paragraph>
							</div>
						)}
						{loginStep === 1 && (
							<Space orientation="vertical" size={24} style={{ width: "100%" }}>
								<Button
									type="primary"
									style={{ width: "100%" }}
									onClick={() => setLoginStep(2)}
								>
									{t("signin.email.title", "Log in with email")}
								</Button>
								<Button
									type="primary"
									style={{ width: "100%" }}
									icon={<IconBrandGoogle size={16} />}
									onClick={() => {
										if (toCheckpoint) markCheckpointSignIn("google");
										signIn(
											"google",
											{ callbackUrl },
											{ prompt: "select_account consent" },
										);
									}}
								>
									{t("signin.google.title", "Log in with Google")}
								</Button>
								<Link
									href={
										toCheckpoint
											? entryRegistrationHref(
													new URL(callbackUrl, "http://x").searchParams.get(
														"project",
													),
												)
											: "/registration"
									}
									className={styles.createAccountLink}
								>
									{t("signin.createAccount.title", "Create new account")}
								</Link>
								<Link href={`/`}>
									<Button
										className="btn-default-on-white"
										style={{ width: "100%" }}
									>
										{t("signin.backToMain.title", "Back to main")}
									</Button>
								</Link>
							</Space>
						)}

						{loginStep === 2 && (
							<Space orientation="vertical" size={24} style={{ width: "100%" }}>
								<Paragraph>
									{t(
										"signin.subtitle",
										"We will send a letter to email with a link to log into your account",
									)}
								</Paragraph>

								<Form variant="filled" form={form} layout="vertical">
									<Form.Item
										name="email"
										label={t("signin.email.label", "Enter Email")}
										rules={[
											{
												type: "email",
												required: true,
												message: "Please enter Email",
											},
										]}
									>
										<Input variant="filled" />
									</Form.Item>
								</Form>

								<Flex justify="center" wrap="wrap" gap={16}>
									<Button
										type="primary"
										onClick={handleSend}
										loading={submitting}
									>
										{t("signin.email.sendLink.title", "Send link to email")}
									</Button>
									<Button type="link" onClick={() => setLoginStep(1)}>
										{t("signin.email.back.title", "Back")}
									</Button>
								</Flex>
							</Space>
						)}

						{loginStep === 3 && (
							<MagicLinkSent
								title={t("signin.email.sent.title", "Check your email")}
								lead={t(
									"signin.email.sent.lead",
									"We have sent a sign-in link to",
								)}
								email={email}
								hint={t(
									"signin.email.sent.hint",
									"Open the link to finish signing in — you will land straight in the platform. The link works once.",
								)}
							>
								<Link href="/" style={{ width: "100%" }}>
									<Button
										className="btn-default-on-white"
										style={{ width: "100%" }}
									>
										{t("signin.email.backToMain.title", "Return to main")}
									</Button>
								</Link>
							</MagicLinkSent>
						)}
					</Space>
				</div>
			</div>
		</div>
	);
}
