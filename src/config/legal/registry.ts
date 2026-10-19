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
					"c193172c25be20b1eb58fd5f7c03cf3a1267100034bcdc6be34aed777349c1c4",
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
					"e636fd0dbd3af9a544592c5dcf798c68b6ce4a335079855f06e9dbbdc309b901",
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
					"f74d4c0c1f4f32cd5f3ae6c090b293a785afd9d67b3c3e6fab0709c0bf4b84e3",
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
					"f58586e32250ef49c19bbab618e9183045fc74a7b1ef98fd649d61c8e0f93964",
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
					"50c9f56b70c60b16e67b7d4a9cca1e47a92d8b204cbb199dac0981767fb9ca56",
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
					"a4dddc7f5ccb09b3da08563929940ae93bdec5941d05122e655c60d6a8bb6c01",
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
					"7b9942b9ae94effde5fdbba249e3239457bdf091672a22ec28b811312bfe59ae",
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
