"use client";

import { useTranslate } from "@tolgee/react";
import { Col, Flex, Grid, Menu, Row, Steps, Typography } from "antd";
import type { ItemType } from "antd/es/menu/interface";
import { useEffect, useRef, useState } from "react";
import RegistrationBgImage from "@/assets/images/registration-bg.jpg";
import { OnboardingCompleted } from "@/components/onboarding/OnboardingCompleted";
import { OnboardingError } from "@/components/onboarding/OnboardingError";
import { OnboardingInterestStep } from "@/components/onboarding/OnboardingInterestStep";
import { OnboardingProfileStep } from "@/components/onboarding/OnboardingProfileStep";
import { OnboardingResourceStep } from "@/components/onboarding/OnboardingResourceStep";
import { OnboardingSpecialityStep } from "@/components/onboarding/OnboardingSpecialityStep";
import { OnboardingWelcome } from "@/components/onboarding/OnboardingWelcome";
import styles from "./style.module.scss";

const { Title } = Typography;

export function OnboardingClient() {
	const { t } = useTranslate();
	const screens = Grid.useBreakpoint();
	const containerRef = useRef<HTMLDivElement>(null);
	const [error] = useState<string>();
	const [onboardingStep, setOnboardingStep] = useState(-1);
	const [lastCompletedStep, setLastCompletedStep] = useState(0);
	const [isCompleted, setIsCompleted] = useState(false);

	const onboardingMenu: ItemType<any>[] = [
		{ label: t("user-profile"), key: "user-profile" },
		{
			label: t("specilaity"),
			key: "speciality",
			disabled: lastCompletedStep <= 0,
		},
		{
			label: t("interests"),
			key: "interests",
			disabled: lastCompletedStep <= 1,
		},
		{
			label: t("resources"),
			key: "resources",
			disabled: lastCompletedStep <= 2,
		},
	];

	useEffect(() => {
		if (onboardingStep > lastCompletedStep)
			setLastCompletedStep(onboardingStep);
		if (isCompleted) setLastCompletedStep(3);
	}, [onboardingStep, isCompleted, lastCompletedStep]);

	const onProfileLoading = () => {
		setOnboardingStep(0);
	};

	const handlePreviousStep = () => {
		setOnboardingStep((prev) => prev - 1);
		window.scrollTo({ top: 0 });
	};

	const handleNextStep = () => {
		setOnboardingStep((prev) => prev + 1);
		window.scrollTo({ top: 0 });
	};

	const handleComplete = () => {
		setIsCompleted(true);
	};

	if (error) return <OnboardingError error={error} />;
	if (isCompleted) return <OnboardingCompleted />;

	return (
		<>
			{onboardingStep === -1 && (
				<OnboardingWelcome onNext={() => setOnboardingStep(0)} />
			)}

			{onboardingStep >= 0 && (
				<div
					ref={containerRef}
					className={`${styles.container}`}
					style={{
						backgroundImage: screens.sm
							? `url(${RegistrationBgImage.src})`
							: undefined,
					}}
				>
					<div className="onboarding-box">
						<div className="onboarding-header">
							<Flex align="center">
								<Title style={{ flex: "400px" }}>
									{t("onboarding.registration.title", "Registration")}
								</Title>
								{screens.lg && (
									<Steps
										current={onboardingStep}
										className={styles.horizontalSteps}
										type="dot"
										direction="horizontal"
										items={onboardingMenu}
										style={{ flex: "auto" }}
									/>
								)}
							</Flex>
						</div>
						<div className="onboarding-container">
							<Row>
								<Col xs={0} lg={{ span: 5 }}>
									<div className="onboarding-sidemenu">
										<Menu
											className={styles.leftMenu}
											items={onboardingMenu}
											mode="vertical"
											selectedKeys={[onboardingMenu[onboardingStep].key]}
											onSelect={(info) =>
												setOnboardingStep(
													onboardingMenu.findIndex((d) => d.key === info.key),
												)
											}
										/>
									</div>
								</Col>
								<Col xs={24} lg={{ span: 19 }}>
									{onboardingStep === 0 && (
										<OnboardingProfileStep
											onLoading={onProfileLoading}
											onSave={() => handleNextStep()}
										/>
									)}
									{onboardingStep === 1 && (
										<OnboardingSpecialityStep
											onSave={() => handleNextStep()}
											onPreviousStep={() => handlePreviousStep()}
										/>
									)}
									{onboardingStep === 2 && (
										<OnboardingInterestStep
											onSave={() => handleNextStep()}
											onPreviousStep={() => handlePreviousStep()}
										/>
									)}
									{onboardingStep === 3 && (
										<OnboardingResourceStep
											onSave={() => handleComplete()}
											onPreviousStep={() => handlePreviousStep()}
										/>
									)}
								</Col>
							</Row>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
