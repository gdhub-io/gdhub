import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { PiRocketDuotone } from "@react-icons/all-files/pi/PiRocketDuotone";
import { useMutation } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import { Button, Flex, Modal, message, Spin } from "antd";
import axios, { type AxiosError, type AxiosResponse } from "axios";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import ProjectLegalPreviewModal from "@/components/legal/ProjectLegalPreviewModal";
import {
	DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
	DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
	DEFAULT_MENTOR_FUND_SHARE,
	PLATFORM_SHARE_PERCENT,
} from "@/config/legal";
import { gtmEventTrigger } from "@/helpers/gtm";
import StepOneForm, { type StepOneFormRef } from "./StepOneForm";
import StepTwoForm, { type StepTwoFormRef } from "./StepTwoForm";
import type {
	CreateProjectPayload,
	CreateProjectStepOneValues,
	CreateProjectStepTwoValues,
} from "./types";

type CreateProjectModalProps = {
	open: boolean;
	onCancel: () => void;
};

const initialStepOneValues: CreateProjectStepOneValues = {
	name: "",
	description: "",
	useCoDevelopmentAgreement: false,
};

const initialStepTwoValues: CreateProjectStepTwoValues = {
	acceptRequirements: false,
	authorAgreementAccepted: false,
	mentorFundShare: DEFAULT_MENTOR_FUND_SHARE,
	damageCompensationEnabled: false,
	damageCompensationAmount: DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
};

const CreateProjectModal = ({ open, onCancel }: CreateProjectModalProps) => {
	const router = useRouter();
	const { t } = useTolgee();
	const { data: session } = useSession();
	const [currentStep, setCurrentStep] = useState(0);
	const [showAgreementPreview, setShowAgreementPreview] = useState(false);
	const [stepOneValues, setStepOneValues] =
		useState<CreateProjectStepOneValues>(initialStepOneValues);
	const [stepTwoValues, setStepTwoValues] =
		useState<CreateProjectStepTwoValues>(initialStepTwoValues);
	const stepOneFormRef = useRef<StepOneFormRef>(null);
	const stepTwoFormRef = useRef<StepTwoFormRef>(null);
	const isCoDevelopmentEnabled = stepOneValues.useCoDevelopmentAgreement;

	const {
		mutateAsync: createProject,
		error: createProjectError,
		isPending: isCreateProcessing,
	} = useMutation<
		AxiosResponse<prismaClient.Project>,
		AxiosError<{ message?: string }>,
		CreateProjectPayload
	>({
		mutationFn: (data: CreateProjectPayload) =>
			axios.post<prismaClient.Project>("/api/user/project", data),
	});

	useEffect(() => {
		const error = createProjectError as AxiosError<{ message?: string }>;
		if (error?.response?.data?.message) {
			message.error(error.response?.data?.message);
		}
	}, [createProjectError]);

	useEffect(() => {
		if (open) return;

		setCurrentStep(0);
		setShowAgreementPreview(false);
		setStepOneValues(initialStepOneValues);
		setStepTwoValues(initialStepTwoValues);
		stepOneFormRef.current?.reset();
		stepTwoFormRef.current?.reset();
	}, [open]);

	const projectAppendixInput = useMemo(() => {
		return {
			projectName: stepOneValues.name.trim() || t("New project"),
			authorName: session?.user?.name || undefined,
			mentorFundShare: stepTwoValues.mentorFundShare,
			platformShare: PLATFORM_SHARE_PERCENT,
			damageCompensationEnabled: stepTwoValues.damageCompensationEnabled,
			damageCompensationAmount: stepTwoValues.damageCompensationAmount,
			damageCompensationCurrency: DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
		};
	}, [
		session?.user?.name,
		stepOneValues.name,
		stepTwoValues.damageCompensationAmount,
		stepTwoValues.damageCompensationEnabled,
		stepTwoValues.mentorFundShare,
		t,
	]);

	const handleCreate = async () => {
		try {
			const currentStepTwoValues = await stepTwoFormRef.current?.validate();
			if (!currentStepTwoValues) return;
			setStepTwoValues(currentStepTwoValues);

			const payload: CreateProjectPayload = {
				name: stepOneValues.name,
				description: stepOneValues.description,
				acceptRequirements: Boolean(currentStepTwoValues.acceptRequirements),
				useCoDevelopmentAgreement: isCoDevelopmentEnabled,
			};

			if (isCoDevelopmentEnabled) {
				payload.authorAgreementAccepted = Boolean(
					currentStepTwoValues.authorAgreementAccepted,
				);
				payload.mentorFundShare =
					currentStepTwoValues.mentorFundShare ?? DEFAULT_MENTOR_FUND_SHARE;
				payload.damageCompensationEnabled = Boolean(
					currentStepTwoValues.damageCompensationEnabled,
				);
				if (payload.damageCompensationEnabled) {
					payload.damageCompensationAmount =
						currentStepTwoValues.damageCompensationAmount ??
						DEFAULT_DAMAGE_COMPENSATION_AMOUNT;
				}
			}

			const project = await createProject(payload);
			gtmEventTrigger("project_create", {
				projectId: project.data.id,
				name: project.data.name,
			});

			router.push(`/my/projects/${project.data.slug}`);
		} catch (error) {
			const hasErrorFields =
				typeof error === "object" &&
				error !== null &&
				Object.hasOwn(error, "errorFields");

			if (!hasErrorFields) {
				message.error(
					error instanceof Error ? error.message : t("Unknown error"),
				);
			}
		}
	};

	const handleContinue = async () => {
		try {
			const currentStepOneValues = await stepOneFormRef.current?.validate();
			if (!currentStepOneValues) return;
			setStepOneValues(currentStepOneValues);
			setCurrentStep(1);
		} catch (error) {
			console.error(error);
		}
	};

	const handleCancel = () => {
		onCancel();
	};

	return (
		<>
			<Modal
				centered
				title={
					<Flex align="center" gap={8}>
						<PiRocketDuotone size={32} />
						{t("modal.create-project.title", "Create new game project")}
					</Flex>
				}
				width={720}
				destroyOnHidden
				maskClosable={false}
				open={open}
				onCancel={handleCancel}
				footer={[
					<Button key="cancel" onClick={handleCancel}>
						{t("modal.create-project.cancel-text", "Cancel")}
					</Button>,
					currentStep === 1 ? (
						<Button key="back" onClick={() => setCurrentStep(0)}>
							{t("Back")}
						</Button>
					) : null,
					currentStep === 0 ? (
						<Button
							key="continue"
							type="primary"
							onClick={handleContinue}
							loading={isCreateProcessing}
						>
							{t("Continue")}
						</Button>
					) : (
						<Button
							key="create"
							type="primary"
							onClick={handleCreate}
							loading={isCreateProcessing}
						>
							{t("modal.create-project.ok-text", "Create")}
						</Button>
					),
				]}
			>
				<Spin spinning={isCreateProcessing}>
					{currentStep === 0 ? (
						<StepOneForm
							ref={stepOneFormRef}
							initialValues={stepOneValues}
							onValuesChange={setStepOneValues}
						/>
					) : (
						<StepTwoForm
							ref={stepTwoFormRef}
							initialValues={stepTwoValues}
							isCoDevelopmentEnabled={isCoDevelopmentEnabled}
							onPreviewAgreement={() => setShowAgreementPreview(true)}
							onValuesChange={setStepTwoValues}
						/>
					)}
				</Spin>
			</Modal>

			<ProjectLegalPreviewModal
				open={showAgreementPreview}
				onClose={() => setShowAgreementPreview(false)}
				appendixInput={projectAppendixInput}
				showProjectAppendix
			/>
		</>
	);
};

export default CreateProjectModal;
