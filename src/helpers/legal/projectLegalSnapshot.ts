import {
	DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
	DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
	DEFAULT_MENTOR_FUND_SHARE,
	PLATFORM_SHARE_PERCENT,
} from "@/config/legal";

export type ProjectLegalSnapshotInput = {
	projectName: string;
	projectId?: string | null;
	projectSlug?: string | null;
	authorName?: string | null;
	mentorFundShare?: number | null;
	investmentReserve?: number | null;
	platformShare?: number | null;
	damageCompensationEnabled?: boolean;
	damageCompensationAmount?: number | null;
	damageCompensationCurrency?: string | null;
	agreementDate?: string | Date | null;
};

const normalizeDate = (value?: string | Date | null) => {
	if (!value) return new Date();

	return value instanceof Date ? value : new Date(value);
};

const formatDate = (value?: string | Date | null) => {
	const date = normalizeDate(value);

	if (Number.isNaN(date.getTime())) {
		return new Date().toLocaleDateString("en-GB");
	}

	return date.toLocaleDateString("en-GB");
};

const formatPercent = (value?: number | null) => {
	return `${Number(value ?? 0).toFixed(1)}%`;
};

export const getProjectLegalTerms = (input: ProjectLegalSnapshotInput) => {
	const platformShare = input.platformShare ?? PLATFORM_SHARE_PERCENT;
	const mentorFundShare = input.mentorFundShare ?? DEFAULT_MENTOR_FUND_SHARE;
	const damageCompensationEnabled = input.damageCompensationEnabled ?? true;
	const damageCompensationAmount =
		input.damageCompensationAmount ?? DEFAULT_DAMAGE_COMPENSATION_AMOUNT;
	const damageCompensationCurrency =
		input.damageCompensationCurrency ?? DEFAULT_DAMAGE_COMPENSATION_CURRENCY;

	return [
		{
			key: "project",
			label: "Project",
			value: input.projectName,
		},
		{
			key: "projectId",
			label: "Project ID",
			value: input.projectId || "Will be assigned after creation",
		},
		{
			key: "author",
			label: "Author",
			value: input.authorName || "Project creator",
		},
		{
			key: "agreementDate",
			label: "Agreement date",
			value: formatDate(input.agreementDate),
		},
		{
			key: "platformShare",
			label: "Platform share",
			value: formatPercent(platformShare),
		},
		{
			key: "mentorFundShare",
			label: "Mentor fund",
			value: formatPercent(mentorFundShare),
		},
		{
			key: "damageCompensation",
			label: "Damage compensation",
			value: damageCompensationEnabled
				? `${damageCompensationAmount.toLocaleString("en-US")} ${damageCompensationCurrency}`
				: "Disabled",
		},
	];
};

export const buildProjectLegalSnapshotMarkdown = (
	baseAgreementMarkdown: string,
	input: ProjectLegalSnapshotInput,
) => {
	const terms = getProjectLegalTerms(input);

	return `${baseAgreementMarkdown.trim()}\n\n---\n\n## Project Appendix\n\n${terms
		.map((term) => `- **${term.label}:** ${term.value}`)
		.join(
			"\n",
		)}\n\n## Legal Note\n\n- This appendix is generated from the current project settings in the application.\n- Any future changes to agreement terms, mentor fund, or compensation terms should be reflected in the legal appendix and re-confirmed by the team.\n`;
};
