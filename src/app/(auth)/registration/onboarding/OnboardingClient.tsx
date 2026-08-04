"use client";

import { useEffect, useState } from "react";
import { OnboardingCompleted } from "@/components/onboarding/OnboardingCompleted";
import { OnboardingError } from "@/components/onboarding/OnboardingError";
import { OnboardingInterestStep } from "@/components/onboarding/OnboardingInterestStep";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { OnboardingProfileStep } from "@/components/onboarding/OnboardingProfileStep";
import { OnboardingResourceStep } from "@/components/onboarding/OnboardingResourceStep";
import { OnboardingSpecialityStep } from "@/components/onboarding/OnboardingSpecialityStep";
import { OnboardingWelcome } from "@/components/onboarding/OnboardingWelcome";

export function OnboardingClient() {
	const [error] = useState<string>();
	const [onboardingStep, setOnboardingStep] = useState(-1);
	const [lastCompletedStep, setLastCompletedStep] = useState(0);
	const [isCompleted, setIsCompleted] = useState(false);

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

	return (
		<OnboardingLayout step={isFullPageStep ? null : onboardingStep}>
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
		</OnboardingLayout>
	);
}
