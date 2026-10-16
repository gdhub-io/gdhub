"use client";

import { IconBrandGoogle } from "@tabler/icons-react";
import { T, useTolgee } from "@tolgee/react";
import {
	Button,
	Checkbox,
	Flex,
	Form,
	Input,
	message,
	notification,
	Space,
	Typography,
} from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { MagicLinkSent } from "@/components/auth/MagicLinkSent";
import {
	CHECKPOINT_ENTRY_HREF,
	CHECKPOINT_INTENT,
} from "@/components/checkpoints/entry/hrefs";
import { setCookie } from "@/helpers/cookie";
import { gtmEventTrigger } from "@/helpers/gtm";
import styles from "./style.module.scss";

const { Paragraph, Title } = Typography;

export function RegistrationClient() {
	const searchParams = useSearchParams();
	const [formRegEmail] = Form.useForm();
	const [formRegGoogle] = Form.useForm();
	const { t, getLanguage } = useTolgee();
	const [registrationStep, setRegistrationStep] = useState({
		step: 1,
		provider: "email",
	});
	const [email, setEmail] = useState<string>();
	const [isRegistration, setIsRegistration] = useState(false);

	const forParam = searchParams?.get("for") || "";
	const intent = searchParams?.get("intent") || "";

	/** Where sign-up lands: onboarding, or straight to the checkpoint hub when it came from there. */
	const afterSignUp = (provider: "email" | "google") =>
		intent === CHECKPOINT_INTENT
			? CHECKPOINT_ENTRY_HREF
			: `/registration/onboarding?locale=${getLanguage()}&provider=${provider}${forParam ? `&for=${forParam}` : ""}`;

	const handleSendWithEmail = async () => {
		let values: Awaited<ReturnType<typeof formRegEmail.validateFields>>;
		try {
			values = await formRegEmail.validateFields();
		} catch {
			// The form renders the messages; the button just stops here.
			return;
		}

		const { email, agreeWithTermsAndPrivacy, needSubscribeToNewsletter } =
			values;

		setIsRegistration(true);

		setCookie(
			"auth.email.pre-registration",
			JSON.stringify({
				for: forParam,
				intent,
				agreeWithTermsAndPrivacy,
				needSubscribeToNewsletter,
			}),
		);

		const response = await signIn("email", {
			email,
			redirect: false,
			callbackUrl: afterSignUp("email"),
		});

		if (response?.ok) {
			setRegistrationStep({ step: 3, provider: "email" });
			gtmEventTrigger("user_registration", { provider: "email" });
		}

		if (response?.error) {
			message.error(response?.error);
		}

		setEmail(email);
		setIsRegistration(false);
	};

	const handleSendWithGoogle = async () => {
		let values: Awaited<ReturnType<typeof formRegGoogle.validateFields>>;
		try {
			values = await formRegGoogle.validateFields();
		} catch {
			return;
		}

		const { agreeWithTermsAndPrivacy, needSubscribeToNewsletter } = values;

		setIsRegistration(true);

		setCookie(
			"auth.google.pre-registration",
			JSON.stringify({
				for: forParam,
				intent,
				agreeWithTermsAndPrivacy,
				needSubscribeToNewsletter,
			}),
		);

		await signIn(
			"google",
			{
				callbackUrl: afterSignUp("google"),
			},
			{ prompt: "select_account consent" },
		);

		gtmEventTrigger("user_registration", { provider: "google" });

		setIsRegistration(false);
	};

	return (
		<div
			className={`${styles.container} bright-container`}
			// style={{
			// 	backgroundImage: screens.sm
			// 		? `url(${RegistrationBgImage.src})`
			// 		: undefined,
			// }}
		>
			<div className="login-form">
				<Space orientation="vertical" size={40} style={{ width: "100%" }}>
					{registrationStep.step < 3 && (
						<div>
							<Title style={{ marginBottom: 4 }}>
								{t("Registration", "Registration")}
							</Title>
							<Paragraph type="secondary" style={{ margin: 0 }}>
								{t(
									"page.registration.platformSubtitle",
									"on the gdhub.io platform",
								)}
							</Paragraph>
						</div>
					)}
					{registrationStep.step === 1 && (
						<Space orientation="vertical" size={24} style={{ width: "100%" }}>
							<Button
								type="primary"
								style={{ width: "100%" }}
								onClick={() =>
									setRegistrationStep({ step: 2, provider: "email" })
								}
							>
								{t("Create new account", "Create new account")}
							</Button>
							<Button
								type="primary"
								style={{ width: "100%" }}
								icon={<IconBrandGoogle size={16} />}
								onClick={() =>
									setRegistrationStep({ step: 2, provider: "google" })
								}
							>
								{t(
									"page.registration.registrationWithGoogle",
									"Registration with Google",
								)}
							</Button>
							<Link
								href={
									intent === CHECKPOINT_INTENT
										? `/signin?callbackUrl=${encodeURIComponent(CHECKPOINT_ENTRY_HREF)}`
										: "/signin"
								}
								className={styles.createAccountLink}
							>
								{t(
									"page.registration.iAlreadyHaveAnAccount",
									"I already have an account",
								)}
							</Link>
							<Link href="/">
								<Button
									className="btn-default-on-white"
									style={{ width: "100%" }}
								>
									{t("page.registration.backToMain", "Back to main")}
								</Button>
							</Link>
						</Space>
					)}

					{registrationStep.step === 2 &&
						registrationStep.provider === "google" && (
							<Space orientation="vertical" size={24} style={{ width: "100%" }}>
								<Form variant="filled" form={formRegGoogle} layout="vertical">
									<Flex vertical gap={12}>
										<Form.Item
											name="agreeWithTermsAndPrivacy"
											valuePropName="checked"
											noStyle
											rules={[
												{
													validator: (_, value) => {
														if (!value) {
															notification.error({
																message: t(
																	"agreeWithTermsAndPrivacy.error",
																	"You should confirm the accuracy of the information entered",
																),
															});
														}
														return value ? Promise.resolve() : Promise.reject();
													},
												},
											]}
										>
											<Checkbox>
												<T
													keyName="page.registration.agreeWithTermsAndPrivacy"
													defaultValue="By joining, you agree to our <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>"
													params={{
														terms: (
															<Link
																href="/terms"
																target="_blank"
																rel="noreferrer"
																className={styles.policyLink}
																onClick={(e) => e.stopPropagation()}
															/>
														),
														privacy: (
															<Link
																href="/privacy-policy"
																target="_blank"
																rel="noreferrer"
																className={styles.policyLink}
																onClick={(e) => e.stopPropagation()}
															/>
														),
													}}
												/>
											</Checkbox>
										</Form.Item>

										<Form.Item
											name="needSubscribeToNewsletter"
											valuePropName="checked"
											noStyle
										>
											<Checkbox>
												{t(
													"page.registration.subscribeToNewsletter",
													"Receive platform news",
												)}
											</Checkbox>
										</Form.Item>
									</Flex>
								</Form>

								<Flex justify="center" wrap="wrap" gap={16}>
									<Button
										type="primary"
										onClick={handleSendWithGoogle}
										loading={isRegistration}
									>
										{t(
											"page.registration.continueWithGoogle",
											"Continue with Google",
										)}
									</Button>
									<Button
										type="link"
										onClick={() =>
											setRegistrationStep({ step: 1, provider: "email" })
										}
									>
										{t("page.registration.back", "Back")}
									</Button>
								</Flex>
							</Space>
						)}

					{registrationStep.step === 2 &&
						registrationStep.provider === "email" && (
							<Space orientation="vertical" size={24} style={{ width: "100%" }}>
								<Paragraph>
									{t(
										"page.registration.email.subtitle",
										"We will send a letter to email with a registration link",
									)}
								</Paragraph>

								<Form variant="filled" form={formRegEmail} layout="vertical">
									<Form.Item
										name="email"
										label={t(
											"page.registration.email.enterEmail",
											"Enter Email",
										)}
										rules={[
											{
												type: "email",
												required: true,
												message: t(
													"page.registration.email.pleaseEnterEmail",
													"Please enter Email",
												),
											},
										]}
									>
										<Input variant="filled" autoComplete="email" />
									</Form.Item>

									<Flex vertical gap={12}>
										<Form.Item
											name="agreeWithTermsAndPrivacy"
											valuePropName="checked"
											noStyle
											rules={[
												{
													validator: (_, value) => {
														if (!value) {
															notification.error({
																message: t(
																	"agreeWithTermsAndPrivacy.error",
																	"You should confirm the accuracy of the information entered",
																),
															});
														}
														return value ? Promise.resolve() : Promise.reject();
													},
												},
											]}
										>
											<Checkbox>
												<T
													keyName="page.registration.agreeWithTermsAndPrivacy"
													defaultValue="By joining, you agree to our <terms>Terms of Service</terms> and <privacy>Privacy Policy</privacy>"
													params={{
														terms: (
															<Link
																href="/terms"
																target="_blank"
																rel="noreferrer"
																className={styles.policyLink}
																onClick={(e) => e.stopPropagation()}
															/>
														),
														privacy: (
															<Link
																href="/privacy-policy"
																target="_blank"
																rel="noreferrer"
																className={styles.policyLink}
																onClick={(e) => e.stopPropagation()}
															/>
														),
													}}
												/>
											</Checkbox>
										</Form.Item>

										<Form.Item
											name="needSubscribeToNewsletter"
											valuePropName="checked"
											noStyle
										>
											<Checkbox>
												{t(
													"page.registration.subscribeToNewsletter",
													"Receive platform news",
												)}
											</Checkbox>
										</Form.Item>
									</Flex>
								</Form>

								<Flex justify="center" wrap="wrap" gap={16}>
									<Button
										type="primary"
										onClick={handleSendWithEmail}
										loading={isRegistration}
									>
										{t(
											"page.registration.sendRegistrationLink",
											"Send registration link",
										)}
									</Button>
									<Button
										type="link"
										onClick={() =>
											setRegistrationStep({ step: 1, provider: "email" })
										}
									>
										{t("page.registration.back", "Back")}
									</Button>
								</Flex>
							</Space>
						)}

					{registrationStep.step === 3 &&
						registrationStep.provider === "email" && (
							<MagicLinkSent
								title={t(
									"page.registration.email.sent.title",
									"Confirm your email",
								)}
								lead={t(
									"page.registration.email.sent.lead",
									"We have sent a confirmation link to",
								)}
								email={email}
								hint={t(
									"page.registration.email.sent.hint",
									"Open the link to confirm your address. Registration continues right there — the remaining steps wait for you behind it.",
								)}
							>
								<Link href="/" style={{ width: "100%" }}>
									<Button
										className="btn-default-on-white"
										style={{ width: "100%" }}
									>
										{t("page.registration.backToMain", "Back to main")}
									</Button>
								</Link>
							</MagicLinkSent>
						)}
				</Space>
			</div>
		</div>
	);
}
