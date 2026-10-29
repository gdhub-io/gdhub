import type {
	AdminPayoutRowDto,
	AdminPayoutsDto,
	PayoutCheckpointDto,
} from "@/types/checkpoints";

/** Frame 13.2's September, shared by the payouts stories. */
const fee = (
	feeId: string,
	extra: Partial<PayoutCheckpointDto> &
		Pick<PayoutCheckpointDto, "projectName" | "fee">,
): PayoutCheckpointDto => ({
	feeId,
	checkpointId: feeId,
	number: 1,
	stageName: "Concept",
	closedAt: "2026-09-11T10:00:00.000Z",
	paid: 45000,
	refunded: 0,
	reason: "Full",
	parts: 6,
	...extra,
});

export const ANNA: AdminPayoutRowDto = {
	curatorId: "anna",
	name: "Anna Petrova",
	image: null,
	level: "Expert",
	rating: { average: 4.6, count: 12 },
	details: {
		holder: "Anna Petrova",
		account: "DE89 •••• 3000",
		invoicing: "SelfEmployed",
	},
	checkpoints: [
		fee("f1", {
			projectName: "Quiet Orbit",
			number: 4,
			stageName: "Launch prep",
			closedAt: "2026-09-28T10:00:00.000Z",
			fee: 31500,
		}),
		fee("f2", {
			projectName: "Moss Garden",
			number: 2,
			stageName: "Demo",
			closedAt: "2026-09-19T10:00:00.000Z",
			refunded: 15000,
			reason: "RefundReduced",
			parts: 4,
			fee: 21000,
		}),
		fee("f3", {
			projectName: "Night Ferry",
			reason: "Replacement",
			parts: 3,
			fee: 15750,
		}),
	],
	amount: 68250,
	status: "due",
	payout: null,
};

export const LEA: AdminPayoutRowDto = {
	curatorId: "lea",
	name: "Lea Novak",
	image: null,
	level: "Experienced",
	rating: { average: null, count: 3 },
	details: null,
	checkpoints: [
		fee("f4", { projectName: "Paper Kites", fee: 21000, paid: 30000 }),
		fee("f5", {
			projectName: "Salt Line",
			number: 3,
			stageName: "Vertical slice",
			fee: 21000,
			paid: 30000,
		}),
	],
	amount: 42000,
	status: "due",
	payout: null,
};

const JONAS: AdminPayoutRowDto = {
	curatorId: "jonas",
	name: "Jonas Weber",
	image: null,
	level: "Experienced",
	rating: { average: null, count: 0 },
	details: {
		holder: "Jonas Weber",
		account: "PL61 •••• 8874",
		invoicing: "SelfBilling",
	},
	checkpoints: [
		fee("f6", {
			projectName: "Brass Choir",
			paid: 30000,
			refunded: 6000,
			reason: "RefundReduced",
			parts: 4,
			fee: 16800,
		}),
	],
	amount: 16800,
	status: "due",
	payout: null,
};

const SOFIA: AdminPayoutRowDto = {
	curatorId: "sofia",
	name: "Sofia Marin",
	image: null,
	level: "Expert",
	rating: { average: 4.2, count: 7 },
	details: {
		holder: "Marin Audio SL",
		account: "ES91 •••• 1332",
		invoicing: "Company",
	},
	checkpoints: [
		fee("f7", {
			projectName: "Low Tide",
			reason: "Replacement",
			parts: 2,
			fee: 10500,
		}),
	],
	amount: 10500,
	status: "due",
	payout: null,
};

export const MARCUS: AdminPayoutRowDto = {
	curatorId: "marcus",
	name: "Marcus Lind",
	image: null,
	level: "Expert",
	rating: { average: null, count: 2 },
	details: {
		holder: "Lind Games AB",
		account: "SE45 •••• 7731",
		invoicing: "Company",
	},
	checkpoints: [
		fee("f8", { projectName: "Ember Wake", number: 2, fee: 31500 }),
	],
	amount: 31500,
	status: "paid",
	payout: {
		id: "payout-marcus",
		paidOn: "2026-10-03T00:00:00.000Z",
		reference: "SEB-20261003-0418",
		note: "SEB charged €2 on our side",
		paidBy: "Dmitry Drynov",
	},
};

export const SEPTEMBER: AdminPayoutsDto = {
	month: "2026-09-01T00:00:00.000Z",
	dueOn: "2026-10-15T00:00:00.000Z",
	firstMonth: "2026-06-01T00:00:00.000Z",
	rows: [ANNA, LEA, JONAS, SOFIA, MARCUS],
	totals: { toPay: 137550, paid: 31500, curatorsPaid: 1, curatorsDue: 4 },
};
