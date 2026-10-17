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
	/** Published for reading only (privacy, cookies, refunds) when false. */
	accepted: boolean;
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
		accepted: true,
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: true,
				checksum:
					"2160a586a82744e79cf6938c68beae8cf67da6016c53cd8f113abd24fb20abd3",
			},
		],
	},
	PrivacyPolicy: {
		slug: "privacy-policy",
		title: "Privacy Policy",
		issuer: "hub",
		group: "platform",
		accepted: false,
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
		accepted: false,
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
		accepted: false,
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"c685f609a02e0ab5b5c1c764d7dab3024699d4757011a87bea5a0445135e0302",
			},
		],
	},
	ProjectRequirements: {
		slug: "project-requirements",
		title: "Project Requirements",
		issuer: "hub",
		group: "platform",
		accepted: true,
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
		accepted: true,
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"8ff7b4e33828a8c31f38c846fe6e5ebaec9c2c82ff97383120d58336e0e222b1",
			},
		],
	},
	ExpertServicesTerms: {
		slug: "expert-services-terms",
		title: "Expert Services Terms",
		issuer: "hub",
		group: "features",
		accepted: true,
		versions: [],
	},
	CheckpointPurchaseTerms: {
		slug: "checkpoint-purchase-terms",
		title: "Checkpoint Purchase Terms",
		issuer: "hub",
		group: "features",
		accepted: true,
		versions: [
			{
				version: 1,
				effectiveAt: "2026-10-17",
				entity: "vsi",
				materialChange: false,
				checksum:
					"168f896cc62541183ee4d5db706b139e16fb36d06bd6005805b2bf7acdff02d8",
			},
		],
	},
	WithdrawalWaiver: {
		slug: "withdrawal-waiver",
		title: "Withdrawal Waiver",
		issuer: "hub",
		group: "features",
		accepted: true,
		versions: [],
	},
	CheckpointStandard: {
		slug: "checkpoint-standard",
		title: "Checkpoint Standard",
		issuer: "hub",
		group: "features",
		accepted: true,
		versions: [],
	},
	CoDevelopmentAgreement: {
		slug: "co-development-agreement",
		title: "Co-Development Agreement",
		issuer: "hub",
		group: "features",
		accepted: true,
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
