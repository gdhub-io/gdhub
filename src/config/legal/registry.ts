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
				entity: "founder",
				materialChange: true,
				checksum:
					"0a26b194777632ef6aae74153ccacae0ef94dfa9ecb0f8491e4973362dd9ecc0",
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
				entity: "founder",
				materialChange: false,
				checksum:
					"934c1aab9f97c38f65bbe0e43ce3a2c56948a51c39f12e11a210b873bcdbe1c9",
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
				entity: "founder",
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
				entity: "founder",
				materialChange: false,
				checksum:
					"a1a65a10350e9e51e7fb54f12d0b5b15a4d46cce06c47c394f42d9efd7d1be37",
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
				entity: "founder",
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
		// Unpublished until paid advising has a seller (GDHUB-108); the text stays as a draft.
		versions: [],
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
				entity: "founder",
				materialChange: false,
				checksum:
					"36e6728770eefde4efa6cc37b143f85e3d822bac448fa05876f8cde2a5de59ad",
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
				entity: "founder",
				materialChange: false,
				checksum:
					"8ca9e939cafcd051f33cf7149fe697ce9450b49c73a9d62d56a67035e210ae0e",
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
	"PaidWork",
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
