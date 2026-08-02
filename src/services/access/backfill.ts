import { SpaceRole, strongestRole } from "@/config/permissions/roles";
import type { SpaceType } from "@/config/spaces";

/** One membership the backfill wants to create. */
export type Candidate = {
	type: SpaceType;
	spaceId: string;
	userId: string;
	role: SpaceRole;
	/** Where it came from, for the report. */
	source: string;
};

export type MergedMembership = {
	type: SpaceType;
	spaceId: string;
	userId: string;
	role: SpaceRole;
	sources: string[];
};

const key = (candidate: Candidate) =>
	`${candidate.type}:${candidate.spaceId}:${candidate.userId}`;

/**
 * Collapses candidates from different domain tables into one membership per
 * (space, user), keeping the strongest role.
 *
 * The conflicts are real: a project author is also a `Founder` team member, and
 * an event creator may be an approved participant of their own event. Whichever
 * query found them first must not decide their role.
 */
export function mergeMemberships(candidates: Candidate[]): MergedMembership[] {
	const merged = new Map<string, MergedMembership>();

	for (const candidate of candidates) {
		const id = key(candidate);
		const existing = merged.get(id);

		if (!existing) {
			merged.set(id, {
				type: candidate.type,
				spaceId: candidate.spaceId,
				userId: candidate.userId,
				role: candidate.role,
				sources: [candidate.source],
			});
			continue;
		}

		existing.role =
			strongestRole([existing.role, candidate.role]) ?? existing.role;
		if (!existing.sources.includes(candidate.source)) {
			existing.sources.push(candidate.source);
		}
	}

	return [...merged.values()];
}

/** Roles the backfill assigns, by domain status. Anything absent stays out. */
export const HUB_ROLE = (onboardingDone: boolean): SpaceRole =>
	onboardingDone ? SpaceRole.Member : SpaceRole.Guest;
