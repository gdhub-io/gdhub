export const checkpointItemSelect = {
	id: true,
	kind: true,
	order: true,
	text: true,
	originalText: true,
	cut: true,
	addedAt: true,
	note: true,
	acceptedNote: true,
	evidence: {
		orderBy: { createdAt: "asc" },
		select: {
			match: true,
			matchNote: true,
			artifact: {
				select: {
					id: true,
					name: true,
					type: true,
					link: true,
					checkStatus: true,
					checkNote: true,
				},
			},
		},
	},
} as const;

/** The purchase terms are a `LegalAcceptance`; the row still says when they were taken. */
const purchaseTermsSelect = {
	where: { code: "CheckpointPurchaseTerms" },
	orderBy: { acceptedAt: "desc" },
	take: 1,
	select: { acceptedAt: true },
} as const;

export const withAcceptedTerms = <
	T extends { legalAcceptances?: { acceptedAt: Date }[] },
>({
	legalAcceptances,
	...row
}: T) => ({
	...row,
	acceptedTermsAt: legalAcceptances?.[0]?.acceptedAt ?? null,
});

/** Everything a checkpoint row needs to be drawn, wherever it is drawn. */
export const checkpointSelect = {
	id: true,
	projectId: true,
	stepId: true,
	stageName: true,
	order: true,
	status: true,
	goal: true,
	curatorKind: true,
	startedAt: true,
	dueAt: true,
	goalAgreedAt: true,
	planCheckedAt: true,
	scopeConfirmedAt: true,
	previousVerdictReadAt: true,
	revisedAt: true,
	revisedNote: true,
	midNote: true,
	summary: true,
	verdict: true,
	verdictNote: true,
	decidedAt: true,
	legalAcceptances: purchaseTermsSelect,
	curatorAcceptedAt: true,
	curatorDeclinedAt: true,
	declinedCuratorIds: true,
	paymentId: true,
	createdAt: true,
	updatedAt: true,
	curator: { select: { id: true, name: true, image: true } },
	items: { select: checkpointItemSelect, orderBy: { order: "asc" } },
} as const;

// The write-up and the transcript stay on the session page that reads them.
export const sessionRowSelect = {
	select: {
		index: true,
		scheduledAt: true,
		rescheduledAt: true,
		curatorJoinedAt: true,
		endedAt: true,
		contentStatus: true,
		attendeeIds: true,
	},
} as const;

// The card and the page header name the curator's craft; their strongest speciality stands for it.
export const curatorWithCraftSelect = {
	select: {
		id: true,
		name: true,
		image: true,
		specialities: {
			select: { name: true, level: true },
			orderBy: { level: "desc" },
			take: 1,
		},
	},
} as const;

export const withCraft = <
	T extends { specialities: { name: string; level: string }[] },
>(
	curator: T | null,
) => {
	if (!curator) return null;
	const { specialities, ...rest } = curator;

	return { ...rest, speciality: specialities[0] ?? null };
};
