import type { Currency } from "@/config/prisma-enums";

export type LegalEntity = {
	name: string;
	/** What kind of organisation it is, as a text says it after the name. */
	kind: string;
	code: string;
	address: string;
	/** Shown on Legal Details: when and where the entity was registered. */
	registeredAt: string;
	registry: string;
	phone: string;
	/** The registration document, where Legal Details names one. */
	certificate?: string;
	/** Contracts, refunds, disputes. */
	email: string;
	/** General questions, e.g. about cookies. */
	infoEmail: string;
	/** Data-protection requests. */
	privacyEmail: string;
	country: string;
	/** The governing law, as a text names it: "the law of the Republic of Lithuania". */
	law: string;
	/** What the platform charges and pays in — it follows the entity, not a feature. */
	currency: Currency;
};

export const LEGAL_ENTITIES = {
	vsi: {
		name: "VšĮ Žaidimų Kūrėjų Hubas",
		kind: "public institution, a non-governmental non-profit organisation",
		code: "307277444",
		address: "Giedraičių g. 39-R53, LT-09302 Vilnius, Lithuania",
		registeredAt: "2025-07-11",
		registry: "Juridinių asmenų registras",
		phone: "+370 67253194",
		email: "office@gdhub.io",
		infoEmail: "info@gdhub.io",
		privacyEmail: "privacy@gdhub.io",
		country: "Lithuania",
		law: "the law of the Republic of Lithuania",
		currency: "USD",
	},
	founder: {
		name: "Individual Entrepreneur Dzmitry Drynau",
		kind: "individual entrepreneur",
		code: "306422564",
		address:
			"Police Street I Dead End, N5, Samgori District, Tbilisi 0182, Georgia",
		registeredAt: "2023-06-27",
		registry: "LEPL National Agency of Public Registry",
		phone: "+995 599 157 334",
		email: "office@gdhub.io",
		infoEmail: "info@gdhub.io",
		privacyEmail: "privacy@gdhub.io",
		country: "Georgia",
		law: "the laws of Georgia",
		currency: "USD",
		certificate: "Certificate of state registration of a legal entity (2023)",
	},
} as const satisfies Record<string, LegalEntity>;

export type LegalEntityKey = keyof typeof LEGAL_ENTITIES;

/**
 * The entity each hub operates under — every hub space names its own. Only the
 * `default` hub exists today. Changing one is a decision, not a toggle: every
 * document it issues needs a new version naming the new entity (a test refuses
 * otherwise), and the prices in config are restated in its currency.
 */
export const HUB_LEGAL_ENTITIES = {
	default: "vsi",
} as const satisfies Record<string, LegalEntityKey>;

export type HubId = keyof typeof HUB_LEGAL_ENTITIES;

export const hubLegalEntity = (hub: HubId = "default"): LegalEntity =>
	LEGAL_ENTITIES[HUB_LEGAL_ENTITIES[hub]];

/** What Legal Details shows: the founder, and the offices the platform operates through. */
export const LEGAL_DETAILS = {
	founder: "founder",
	offices: [{ country: "Lithuania", entity: "vsi" }],
} as const satisfies {
	founder: LegalEntityKey;
	offices: readonly { country: string; entity: LegalEntityKey }[];
};
