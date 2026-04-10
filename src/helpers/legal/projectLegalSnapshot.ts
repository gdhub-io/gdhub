import { Liquid } from "liquidjs";
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
	projectPageUrl?: string | null;
	sharesPageUrl?: string | null;
	mentorFundShare?: number | null;
	investmentReserve?: number | null;
	platformShare?: number | null;
	damageCompensationEnabled?: boolean;
	damageCompensationAmount?: number | null;
	damageCompensationCurrency?: string | null;
	agreementDate?: string | Date | null;
	workflowSteps?: ProjectLegalWorkflowStep[];
	projectPages?: ProjectLegalPageReference[];
};

export type ProjectLegalWorkflowStep = {
	name: string;
	description?: string | null;
	order?: number | null;
	isCurrent?: boolean;
};

export type ProjectLegalPageReference = {
	title: string;
	page: string;
	description?: string | null;
	url?: string | null;
};

type RenderMode = "plain" | "highlighted";

type LegalTemplateWorkflowStep = {
	name: string;
	description: string;
	currentMark: string;
};

type LegalTemplatePageReference = {
	title: string;
	page: string;
	description: string;
	url: string;
};

const liquidEngine = new Liquid();
const defaultAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://gdhub.io";

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

const escapeHtml = (value: string) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

const highlightValue = (value: string) =>
	`<span style="background: rgba(24, 144, 255, 0.14); color: #0958d9; padding: 0 6px; border-radius: 6px; font-weight: 600;">${escapeHtml(value)}</span>`;

const defaultWorkflowSteps: ProjectLegalWorkflowStep[] = [
	{ name: "Создание концепта игры" },
	{ name: "Создание прототипа игры" },
	{ name: "Создание демо версии игры" },
	{ name: "Организация бета-тестирования" },
	{ name: "Разработка версии для релиза" },
	{
		name: "Публикация игры",
		description:
			"Публикация Игры в магазинах приложений (игр) для ее общедоступности и возможности приобретения игроками",
	},
	{
		name: "Поддержка игры",
		description:
			"Выпуск обновлений, исправление ошибок в работе Игры, улучшение функционала после Публикации игры",
	},
	{
		name: "Завершение проекта",
		description: "Закрытие проекта по окончании активных продаж",
	},
	{
		name: "Закрытие проекта",
		description:
			"Закрытие проекта в случае неуспеха по каким-либо причинам на любом из этапов",
	},
];

const formatTemplateValue = (value: string, mode: RenderMode) =>
	mode === "highlighted" ? highlightValue(value) : value;

const buildProjectPageUrl = (input: ProjectLegalSnapshotInput) => {
	if (input.projectPageUrl) {
		return input.projectPageUrl;
	}

	if (input.sharesPageUrl) {
		return input.sharesPageUrl;
	}

	if (input.projectSlug) {
		return `${defaultAppUrl}/my/projects/${input.projectSlug}/team`;
	}

	return null;
};

const buildWorkflowSteps = (
	workflowSteps: ProjectLegalWorkflowStep[] | undefined,
	mode: RenderMode,
): LegalTemplateWorkflowStep[] => {
	const steps = workflowSteps?.length ? workflowSteps : defaultWorkflowSteps;

	return steps.map((step) => ({
		name: formatTemplateValue(step.name, mode),
		description: step.description
			? formatTemplateValue(step.description, mode)
			: "",
		currentMark: step.isCurrent
			? formatTemplateValue("Текущий этап", mode)
			: "",
	}));
};

const buildProjectPages = (
	projectPages: ProjectLegalPageReference[] | undefined,
	mode: RenderMode,
): LegalTemplatePageReference[] => {
	if (!projectPages?.length) {
		return [];
	}

	return projectPages.map((page) => ({
		title: formatTemplateValue(page.title, mode),
		page: formatTemplateValue(page.page, mode),
		description: page.description
			? formatTemplateValue(page.description, mode)
			: "",
		url: page.url ? formatTemplateValue(page.url, mode) : "",
	}));
};

const renderAgreementTemplate = (
	templateMarkdown: string,
	input: ProjectLegalSnapshotInput,
	mode: RenderMode,
) => {
	const platformShare = input.platformShare ?? PLATFORM_SHARE_PERCENT;
	const mentorFundShare = input.mentorFundShare ?? DEFAULT_MENTOR_FUND_SHARE;
	const damageCompensationEnabled = input.damageCompensationEnabled ?? true;
	const damageCompensationAmount =
		input.damageCompensationAmount ?? DEFAULT_DAMAGE_COMPENSATION_AMOUNT;
	const damageCompensationCurrency =
		input.damageCompensationCurrency ?? DEFAULT_DAMAGE_COMPENSATION_CURRENCY;
	const projectPageUrl =
		buildProjectPageUrl(input) || "[ссылка на страницу проекта]";

	return liquidEngine.parseAndRenderSync(templateMarkdown, {
		projectName: formatTemplateValue(input.projectName, mode),
		authorName: formatTemplateValue(
			input.authorName || "Project creator",
			mode,
		),
		projectPageUrl: formatTemplateValue(projectPageUrl, mode),
		sharesPageUrl: formatTemplateValue(projectPageUrl, mode),
		agreementDate: formatTemplateValue(formatDate(input.agreementDate), mode),
		platformShare: formatTemplateValue(formatPercent(platformShare), mode),
		mentorFundShare: formatTemplateValue(formatPercent(mentorFundShare), mode),
		damageCompensationEnabled,
		damageCompensationAmount: formatTemplateValue(
			`${damageCompensationAmount.toLocaleString("en-US")} ${damageCompensationCurrency}`,
			mode,
		),
		workflowSteps: buildWorkflowSteps(input.workflowSteps, "plain"),
		projectPages: buildProjectPages(input.projectPages, "plain"),
	});
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
	const agreementMarkdown = renderAgreementTemplate(
		baseAgreementMarkdown,
		input,
		"plain",
	);

	return `${agreementMarkdown.trim()}\n\n---\n\n## Project Appendix\n\n${terms
		.map((term) => `- **${term.label}:** ${term.value}`)
		.join(
			"\n",
		)}\n\n## Legal Note\n\n- This appendix is generated from the current project settings in the application.\n- Any future changes to agreement terms, mentor fund, or compensation terms should be reflected in the legal appendix and re-confirmed by the team.\n`;
};

export const buildProjectLegalAgreementMarkdown = (
	baseAgreementMarkdown: string,
	input: ProjectLegalSnapshotInput,
) => {
	return renderAgreementTemplate(baseAgreementMarkdown, input, "highlighted");
};
