"use client";

import { FaGoogle } from "@react-icons/all-files/fa/FaGoogle";
import { useTolgee } from "@tolgee/react";
import {
	Button,
	Checkbox,
	Flex,
	Form,
	Grid,
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
import RegistrationBgImage from "@/assets/images/registration-bg.jpg";
import { setCookie } from "@/helpers/cookie";
import { gtmEventTrigger } from "@/helpers/gtm";
import { EmptyLayout } from "@/layouts/EmptyLayout";
import styles from "./style.module.scss";

const { Paragraph, Title } = Typography;

export function RegistrationClient() {
	const searchParams = useSearchParams();
	const screens = Grid.useBreakpoint();
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

	const handleSendWithEmail = async () => {
		const { email, agreeWithTermsAndPrivacy, needSubscribeToNewsletter } =
			await formRegEmail.validateFields();

		setIsRegistration(true);

		setCookie(
			"auth.email.pre-registration",
			JSON.stringify({
				for: forParam,
				agreeWithTermsAndPrivacy,
				needSubscribeToNewsletter,
			}),
		);

		const response = await signIn("email", {
			email,
			redirect: false,
			callbackUrl: `/registration/onboarding?locale=${getLanguage()}&provider=email${forParam ? `&for=${forParam}` : ""}`,
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
		const { agreeWithTermsAndPrivacy, needSubscribeToNewsletter } =
			await formRegGoogle.validateFields();

		setIsRegistration(true);

		setCookie(
			"auth.google.pre-registration",
			JSON.stringify({
				for: forParam,
				agreeWithTermsAndPrivacy,
				needSubscribeToNewsletter,
			}),
		);

		await signIn(
			"google",
			{
				callbackUrl: `/registration/onboarding?locale=${getLanguage()}&provider=google${forParam ? `&for=${forParam}` : ""}`,
			},
			{ prompt: "select_account consent" },
		);

		gtmEventTrigger("user_registration", { provider: "google" });

		setIsRegistration(false);
	};

	return (
		<EmptyLayout type="dark">
			<div
				className={`${styles.container} bright-container`}
				style={{
					backgroundImage: screens.sm
						? `url(${RegistrationBgImage.src})`
						: undefined,
				}}
			>
				<div className="login-box">
					<div className="login-form">
						<Space orientation="vertical" size={40}>
							{registrationStep.step < 3 && (
								<Title>{t("Registration", "Registration")}</Title>
							)}
							{registrationStep.step === 1 && (
								<Space orientation="vertical" size={24}>
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
										icon={<FaGoogle size={16} />}
										onClick={() =>
											setRegistrationStep({ step: 2, provider: "google" })
										}
									>
										{t(
											"page.registration.registrationWithGoogle",
											"Registration with Google",
										)}
									</Button>
									<Link href="/signin" className={styles.createAccountLink}>
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
									<Space orientation="vertical" size={24}>
										<Form
											variant="filled"
											form={formRegGoogle}
											layout="vertical"
										>
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
															return value
																? Promise.resolve()
																: Promise.reject();
														},
													},
												]}
											>
												<Checkbox>
													{t(
														"page.registration.agreeWithTermsAndPrivacy",
														"By joining, you agree to our Terms of Service and Privacy Policy",
													)}
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
									<Space orientation="vertical" size={24}>
										<Paragraph>
											{t(
												"page.registration.email.subtitle",
												"We will send a letter to email with a registration link",
											)}
										</Paragraph>

										<Form form={formRegEmail} layout="vertical">
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
												<Input />
											</Form.Item>

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
															return value
																? Promise.resolve()
																: Promise.reject();
														},
													},
												]}
											>
												<Checkbox>
													{t(
														"page.registration.agreeWithTermsAndPrivacy",
														"By joining, you agree to our Terms of Service and Privacy Policy",
													)}
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
									<Space orientation="vertical" size={24}>
										<Paragraph style={{ maxWidth: 400 }}>
											{t(
												"page.registration.email.complete",
												"We have sent an email to {email} with an access link. Follow the link and complete the following registration steps.",
												{ email },
											)}
										</Paragraph>

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
						</Space>
					</div>
				</div>
			</div>
		</EmptyLayout>
	);
}
