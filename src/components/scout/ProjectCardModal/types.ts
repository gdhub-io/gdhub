export type CardSpeciality = { name: string; level: string } | null;

export type CardPerson = {
	id: string;
	name: string | null;
	image: string | null;
	speciality: CardSpeciality;
};

/** The header and what Overview leads with — one small read per open card. */
export type ProjectCardOverview = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	coverImage: string | null;
	videoLink: string | null;
	startedAt: string;
	updatedAt: string;
	details: {
		genre: string | null;
		platform: string | null;
		setting: string | null;
		visualStyle: string | null;
		audition: string | null;
	};
	author: CardPerson;
	/** `Project.links` as the project settings form writes them. */
	links: { platform: string; link: string; isPrimary?: boolean }[];
	stage: string | null;
	stageDeadline: string | null;
	startedStage: string | null;
	/** The workflow task that checks the project's own fields, if there is one. */
	detailsTask: string | null;
	equity: { investmentReserve: number; unallocated: number } | null;
	teamSize: number;
	investorCount: number;
	teamFaces: { id: string; name: string | null; image: string | null }[];
	/** The same figure the games table shows, so the two cannot disagree. */
	estimate: { remaining: number; monthsToRelease: number | null } | null;
	reviewCount: number;
	latestDevlog: {
		id: string;
		publishedAt: string;
		content: string;
		author: { name: string | null } | null;
	} | null;
};

export type CardMember = {
	id: string;
	name: string | null;
	image: string | null;
	position: string | null;
	speciality: CardSpeciality;
	hoursPerWeek: number[] | null;
	isFounder: boolean;
	startedAt: string;
	finishedAt: string | null;
};

export type CardInvestor = {
	id: string;
	/** Their place in the cap table. Investors are numbered, never named. */
	index: number;
	share: number;
};

export type CardFile = {
	id: string;
	name: string | null;
	type: string;
	link: string;
	updatedAt: string;
	createdByUser: { name: string | null } | null;
};

export type CardStep = {
	id: string;
	name: string;
	order: number;
	done: boolean;
	plannedAt: string | null;
	finishedAt: string | null;
	isCurrent: boolean;
};

export type CardActivityKind =
	| "created"
	| "devlog"
	| "step"
	| "file"
	| "member";

export type CardActivity = {
	id: string;
	at: string;
	kind: CardActivityKind;
	/** What the event happened to: a step, a file, a person. */
	subject: string | null;
	author: string | null;
};

export type CardReview = {
	id: string;
	notes: string;
	isApproved: boolean;
	expert: CardPerson;
};

export type CardInvestment = {
	/** What the team says it wants. No such field yet — always `null`. */
	stated: string | null;
	raised: { currency: string; amount: number }[];
	investorCount: number;
	/** Beside the money they put in, rather than a tab away from it. */
	investors: CardInvestor[];
	/** The cap table in the shape the founder's own `EquityPlot` draws. */
	equity: {
		platformShare: number;
		mentorFundShare: number;
		investmentReserve: number;
		shares: {
			memberId: string;
			userId: string;
			name: string | null;
			percentage: number;
			isFixed: boolean;
			vested: boolean;
		}[];
	} | null;
	estimate: {
		remaining: number;
		monthlyBurn: number;
		pace: number;
		monthsToRelease: number | null;
		teamSize: number;
		openPositions: number;
	} | null;
};
