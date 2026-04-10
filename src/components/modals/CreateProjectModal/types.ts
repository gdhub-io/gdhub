export type CreateProjectStepOneValues = {
	name: string;
	description?: string;
	useCoDevelopmentAgreement: boolean;
};

export type CreateProjectStepTwoValues = {
	acceptRequirements: boolean;
	authorAgreementAccepted: boolean;
	mentorFundShare: number;
	damageCompensationEnabled: boolean;
	damageCompensationAmount: number;
};

export type CreateProjectPayload = {
	name: string;
	description?: string;
	acceptRequirements: boolean;
	useCoDevelopmentAgreement: boolean;
	authorAgreementAccepted?: boolean;
	mentorFundShare?: number;
	damageCompensationEnabled?: boolean;
	damageCompensationAmount?: number;
};
