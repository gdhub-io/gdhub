import type {
	SkillLevel,
	VacancyApplicationStatus,
} from "@/config/prisma-enums";
import type { ListingState, PositionState } from "@/lib/vacancy/listing-state";

export type ListingFee = { amount: number; currency: string };

/** A row of `/admin/open-positions` (frame 10.19). */
export type AdminPositionRow = {
	id: string;
	title: string;
	publishedAt: string | null;
	finishedAt: string;
	viewsCount: number;
	direction: { name: string };
	project: { name: string; slug: string } | null;
	state: PositionState;
	listing: ListingState;
	listingFee: ListingFee | null;
	applications: number;
	openApplications: number;
};

export type AdminPositionsResponse = {
	total: number;
	rows: AdminPositionRow[];
};

/** One application as the admin reads it (frame 10.20). */
export type AdminPositionApplication = {
	id: string;
	status: VacancyApplicationStatus;
	message: string | null;
	allowedContacts: string[];
	viewedAt: string | null;
	decidedAt: string | null;
	createdAt: string;
	candidate: { name: string | null; image: string | null };
	speciality: { id: string; name: string; level: SkillLevel };
	chat: {
		openedAt: string;
		closedAt: string | null;
		open: boolean;
		authorLastReadAt: string | null;
	} | null;
};

export type AdminPositionDetail = {
	id: string;
	title: string;
	state: PositionState;
	listing: ListingState;
	listingFee: ListingFee | null;
	finishedAt: string;
	project: { name: string; slug: string } | null;
	applications: AdminPositionApplication[];
};
