"use client";

import { useTranslate } from "@tolgee/react";
import { Grid, Steps, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import GdhubLogo from "@/assets/images/gdhub-beta-black-logo.svg";
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

	const stepItems = [
		{ title: screens.md ? t("user-profile", "Profile") : undefined },
		{ title: screens.md ? t("speciality-step", "Speciality") : undefined },
		{ title: screens.md ? t("interests", "Interests") : undefined },
		{ title: screens.md ? t("resources", "Resources") : undefined },
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

	const isFullPageStep = onboardingStep === -1 || isCompleted;
	const showHeader = onboardingStep >= 0 && !isCompleted;

	return (
		<div
			ref={containerRef}
			className={`${styles.container} ${isFullPageStep ? styles.centered : ""}`}
		>
			<div className={styles.onboardingBox}>
				<div className={styles.logo}>
					<GdhubLogo style={{ width: 100 }} />
				</div>

				{showHeader && (
					<div className={styles.header}>
						<Title className={styles.headerTitle}>
							{t("onboarding.registration.title", "Registration")}
						</Title>
						{screens.md ? (
							<Steps
								current={onboardingStep}
								size="small"
								className={styles.steps}
								items={stepItems}
							/>
						) : (
							<div className={styles.progressBar}>
								{[0, 1, 2, 3].map((i) => (
									<div
										key={i}
										className={`${styles.progressSegment} ${i <= onboardingStep ? styles.progressActive : ""}`}
									/>
								))}
							</div>
						)}
					</div>
				)}

				<div className={styles.content}>
					{onboardingStep === -1 && !isCompleted && (
						<OnboardingWelcome onNext={() => setOnboardingStep(0)} />
					)}
					{onboardingStep === 0 && !isCompleted && (
						<OnboardingProfileStep
							onLoading={onProfileLoading}
							onSave={() => handleNextStep()}
						/>
					)}
					{onboardingStep === 1 && !isCompleted && (
						<OnboardingSpecialityStep
							onSave={() => handleNextStep()}
							onPreviousStep={() => handlePreviousStep()}
						/>
					)}
					{onboardingStep === 2 && !isCompleted && (
						<OnboardingInterestStep
							onSave={() => handleNextStep()}
							onPreviousStep={() => handlePreviousStep()}
						/>
					)}
					{onboardingStep === 3 && !isCompleted && (
						<OnboardingResourceStep
							onSave={() => handleComplete()}
							onPreviousStep={() => handlePreviousStep()}
						/>
					)}
					{isCompleted && <OnboardingCompleted />}
				</div>
			</div>
		</div>
	);
}
