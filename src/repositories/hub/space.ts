import { UserRole } from "@gdhub-io/gdhub-prisma";
import { SpaceRole } from "@/config/permissions/roles";
import { hasQualifiedSpeciality } from "@/repositories/user/speciality";
import { DEFAULT_SPACE_ID, type SpaceAdapter } from "@/services/access/types";

/**
 * Hub space adapter.
 *
 * The hub role doubles as the platform role: `admin` here means staff, and that
 * carries into every other space (docs/roles-and-permissions.md §2, invariant 5).
 *
 * Reads nothing from the database — the session already carries both the legacy
 * `roles` array and `onboardingDone`. After the backfill this is replaced by a
 * `SpaceMember` row.
 */
export const hubSpaceAdapter: SpaceAdapter = {
	resolve: async (_param, user) => ({
		spaceId: DEFAULT_SPACE_ID,
		role: user.roles?.includes(UserRole.Admin)
			? SpaceRole.Admin
			: user.onboardingDone
				? SpaceRole.Member
				: SpaceRole.Guest,
	}),

	/**
	 * Running an event is a craft judgement, not a platform privilege: every
	 * member gets `hub.events.create` from the role, and a member with no
	 * speciality at the expert threshold does not keep it.
	 *
	 * Staff are exempt — organising on behalf of the platform is their job, and
	 * they are not required to hold a speciality to do it.
	 */
	revoked: async (_spaceId, user) => {
		if (user.roles?.includes(UserRole.Admin)) return [];

		return (await hasQualifiedSpeciality(user.id)) ? [] : ["hub.events.create"];
	},
};
