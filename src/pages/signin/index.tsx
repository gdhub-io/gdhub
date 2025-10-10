import { FaGoogle } from "@react-icons/all-files/fa/FaGoogle";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Form, Grid, Input, message, Space, Typography } from "antd";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getServerSession } from "next-auth";
import { signIn } from "next-auth/react";
import React, { useState } from "react";
import LogingBgImage from "@/assets/images/login-bg.jpg";
import { gtmEventTrigger } from "@/helpers/gtm";
import { EmptyLayout } from "@/layouts/EmptyLayout";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import styles from "./style.module.scss";

const { Paragraph, Title } = Typography;

declare global {
	interface Window {
		$crisp?: any;
	}
}

const LoginPage: NextPage = () => {
	const router = useRouter();
	const { t } = useTranslate();
	const screens = Grid.useBreakpoint();
	const [form] = Form.useForm();
	const [loginStep, setLoginStep] = useState(1);
	const [email, setEmail] = useState<string>();
	const [submitting, setSubmitting] = useState<boolean>(false);

	// Check for error in query params
	const { error, callbackUrl } = router.query;

	// Show error message if token expired
	React.useEffect(() => {
		if (error === "RefreshTokenExpired") {
			message.error(t("refresh_token_expired", "Your session has expired. Please sign in again."));
		}

		if (error === "InvalidGrantError") {
			message.error(t("invalid_grant_error", "Invalid authorization. Please sign in again."));
		}
	}, [error, t]);

	const handleSend = async () => {
		setSubmitting(true);

		const { email } = await form.validateFields();

		try {
			const response = await signIn("email", {
				email,
				redirect: false,
				callbackUrl: (router.query.callbackUrl as string) || "/hub",
			});

			setSubmitting(false);
			setEmail(email);

			if (response?.ok) {
				setLoginStep(3);
				gtmEventTrigger("user_login", { provider: "email" });
			}
			if (response?.error) message.error(response?.error);
		} catch (error) {
			message.error(t("error_sending_email", "Error sending email. Please try again."));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<EmptyLayout>
			<Head>
				<title>{t("signin", "Sign in")}</title>
			</Head>
			<div
				className={`${styles.container}`}
				style={{ backgroundImage: screens.sm ? `url(${LogingBgImage.src})` : undefined }}
			>
				<div className="login-box">
					<div className="login-form">
						<Space direction="vertical" size={40}>
							{loginStep < 3 && <Title>{t("signin.title", "Log in")}</Title>}
							{loginStep == 1 && (
								<>
									<Space direction="vertical" size={24}>
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
											icon={<FaGoogle size={16} />}
											onClick={() =>
												signIn(
													"google",
													{ callbackUrl: (router.query.callbackUrl as string) || "/hub" },
													{ prompt: "select_account consent" },
												)
											}
										>
											{t("signin.google.title", "Log in with Google")}
										</Button>
										<Link href="/registration" className={styles.createAccountLink}>
											{t("signin.createAccount.title", "Create new account")}
										</Link>
										<Link href={`/`}>
											<Button className="btn-default-on-white" style={{ width: "100%" }}>
												{t("signin.backToMain.title", "Back to main")}
											</Button>
										</Link>
									</Space>
								</>
							)}

							{loginStep == 2 && (
								<>
									<Space direction="vertical" size={24}>
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
												rules={[{ type: "email", required: true, message: "Please enter Email" }]}
											>
												<Input />
											</Form.Item>
										</Form>

										<Flex justify="center" wrap="wrap" gap={16}>
											<Button type="primary" onClick={handleSend} loading={submitting}>
												{t("signin.email.sendLink.title", "Send link to email")}
											</Button>
											<Button type="link" onClick={() => setLoginStep(1)}>
												{t("signin.email.back.title", "Back")}
											</Button>
										</Flex>
									</Space>
								</>
							)}

							{loginStep == 3 && (
								<Space direction="vertical" size={24}>
									<Paragraph style={{ maxWidth: 400 }}>
										{t(
											"signin.email.complete",
											"We have sent an email to {email} with an access link. Follow the link and complete the following registration steps.",
											{ email },
										)}
									</Paragraph>

									<Link href="/">
										<Button className="btn-default-on-white" style={{ width: "100%" }}>
											{t("signin.email.backToMain.title", "Return to main")}
										</Button>
									</Link>
								</Space>
							)}
						</Space>
					</div>
				</div>
			</div>
		</EmptyLayout>
	);
};

export const getServerSideProps = async (context: any) => {
	const session = await getServerSession(context.req, context.res, authOptions);

	if (session?.user) {
		return {
			redirect: {
				destination: "/hub",
				permanent: false,
			},
		};
	}

	return {
		props: {},
	};
};

export default LoginPage;
