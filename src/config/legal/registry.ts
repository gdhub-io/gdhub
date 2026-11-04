import { E2E_STAND } from "@/lib/stand";
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
			{
				version: 2,
				effectiveAt: "2026-11-04",
				entity: "founder",
				materialChange: true,
				checksum:
					"4f8530e4b66e0cd650c27e8383cce05c80c9891c98d914a1e3c684d2df39b8f6",
				changes: [
					"Paid services are described: a paid vacancy listing is the placement of a listing, and an AI Checkpoint is an automated software service.",
					"Only these two services are sold; courses and events are free.",
					"Buying a paid service requires being 18 or over.",
				],
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
			{
				version: 2,
				effectiveAt: "2026-11-04",
				entity: "founder",
				materialChange: false,
				checksum:
					"e3125c7f68dd36cd683dc2708c267588b52e6ce0024f1c42770262907e0c6b9e",
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
			{
				version: 2,
				effectiveAt: "2026-11-04",
				entity: "founder",
				materialChange: false,
				checksum:
					"3674d53a9974229deed140b9dbf767eadc9d5ff120e9aef0752f83a10bba9c1c",
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
					"4a57a14ad05b5b418016ff74a96b2c5808a0e01b967153f685d77f2cb715de4d",
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
		// Unpublished until paid advising has a seller (GDHUB-108); the text stays as a
		// draft. The e2e stand alone carries a TBD version 0, to walk the curator's
		// agreement step (GDHUB-116).
		versions: E2E_STAND
			? [
					{
						version: 0,
						effectiveAt: "2026-10-01",
						entity: "founder",
						materialChange: false,
						checksum:
							"670f92f139d1dde3da197f0054bc4bfb50de168632ea03b26b3b75a8d0193f08",
					},
				]
			: [],
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
					"5462321185daa278e60659b233c14cc95f1e315c666e5d63fce4c4620ded757d",
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
					"6f786c27fd1e7786422d16d6ffd836b0299ed82ad8f3319721d6e19f82d78c9d",
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
