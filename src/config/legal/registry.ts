import { HUB_LEGAL_ENTITIES, type LegalEntityKey } from "./entities";

export type LegalVersion = {
	version: number;
	/** UTC date the version takes effect; it stays in effect until the next one's. */
	effectiveAt: string;
	entity: LegalEntityKey;
	/** A material change asks everyone it concerns to accept again. */
	materialChange: boolean;
	/** SHA-256 of the text as shown — file plus entity. Checked by a test. */
	checksum: string;
	/** "What changed" on the re-acceptance screen, for a material version. */
	changes?: readonly string[];
};

export type LegalDocumentDefinition = {
	slug: string;
	title: string;
	/** Who issues it: the hub's entity, or a named one (e.g. the founder's sole proprietorship). */
	issuer: "hub" | LegalEntityKey;
	group: "platform" | "features";
	/** Filled in per project, so the checksum is per acceptance, not per version. */
	withParams?: boolean;
	versions: readonly LegalVersion[];
};

/**
 * Every legal document GDHub publishes. A version is a file at
 * `docs/legal/<slug>/v<n>.md`, never edited once merged; a correction is the
 * next version. Documents with no version yet have no text to accept.
 */
export const LEGAL_DOCUMENTS = {
	TermsOfUse: {
		slug: "terms-of-use",
		title: "Terms of Use",
		issuer: "hub",
		group: "platform",
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: true,
				checksum:
					"f67decab3c4018d583f0ed135d9a7106ffce0809b8a19c4072f83e1af45b66e7",
			},
		],
	},
	PrivacyPolicy: {
		slug: "privacy-policy",
		title: "Privacy Policy",
		issuer: "hub",
		group: "platform",
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"8adb763027dbaf4b06c0c0311572e920fd0f85b16e1674d2414ccaed8e9ac0d9",
			},
		],
	},
	CookiePolicy: {
		slug: "cookie-policy",
		title: "Cookie Policy",
		issuer: "hub",
		group: "platform",
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"53b46980251f7cb9855c2cff7cf5438a16ea46a933943eb3aac6a7912fe98a6b",
			},
		],
	},
	RefundPolicy: {
		slug: "refund-policy",
		title: "Refund Policy",
		issuer: "hub",
		group: "platform",
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"645ebb26227552ff96b5ba9bf430fe4fa48f0f16dcc1a12254619f6d0ac381a3",
			},
		],
	},
	ProjectRequirements: {
		slug: "project-requirements",
		title: "Project Requirements",
		issuer: "hub",
		group: "features",
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"39b4e3f4f9a712288b1ffe99a59950182ce3fbe543b12ffa375a112c7f39fc43",
			},
		],
	},
	AdvisorAgreement: {
		slug: "advisor-agreement",
		title: "Advisor Agreement",
		issuer: "hub",
		group: "features",
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"24609f31624d9d2ddfcf72198d0c1e20ddbace4a672241f7b0524f035ad582c9",
			},
		],
	},
	ExpertServicesTerms: {
		slug: "expert-services-terms",
		title: "Expert Services Terms",
		issuer: "hub",
		group: "features",
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"ad978c092bf7af93769dd9e97551af385352e0c2fc64c873192294bb63517dfd",
			},
		],
	},
	CheckpointPurchaseTerms: {
		slug: "checkpoint-purchase-terms",
		title: "Checkpoint Purchase Terms",
		issuer: "hub",
		group: "features",
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"9dd6b4335aeff3efe6645626c40bece9bb311a520fd585684a209fe56f796676",
			},
		],
	},
	WithdrawalWaiver: {
		slug: "withdrawal-waiver",
		title: "Withdrawal Waiver",
		issuer: "hub",
		group: "features",
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"3a166b605a4377185e364fa0d8d2c41ed0cde8c440c7d70ddf64c0eebfe49458",
			},
		],
	},
	CourseAgreement: {
		slug: "course-agreement",
		title: "Course Agreement",
		issuer: "hub",
		group: "features",
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"2efec0770f560867d955ca33612b06c74df8ebdf029bfef0f67bbe650d8b520c",
			},
		],
	},
	CoDevelopmentAgreement: {
		slug: "co-development-agreement",
		title: "Co-Development Agreement",
		issuer: "hub",
		group: "features",
		withParams: true,
		versions: [],
	},
} as const satisfies Record<string, LegalDocumentDefinition>;

export type LegalCode = keyof typeof LEGAL_DOCUMENTS;

export const LEGAL_CODES = Object.keys(LEGAL_DOCUMENTS) as [
	LegalCode,
	...LegalCode[],
];

export const LEGAL_CONTEXTS = [
	"SignUp",
	"ProjectCreate",
	"AdvisorJoin",
	"ExpertServices",
	"CheckpointPurchase",
	"CuratorAccept",
	"ShareChange",
	"ReAcceptance",
] as const;

export type LegalContext = (typeof LEGAL_CONTEXTS)[number];

/** Widened to the definition type, so optional fields read without narrowing per code. */
export const legalDocument = (code: LegalCode): LegalDocumentDefinition =>
	LEGAL_DOCUMENTS[code];

/** The entity a document is issued by now; its version in effect must name it. */
export const issuerOf = (code: LegalCode): LegalEntityKey => {
	const { issuer } = legalDocument(code);
	return issuer === "hub" ? HUB_LEGAL_ENTITIES.default : issuer;
};
