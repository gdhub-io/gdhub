import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import type { Metadata } from "next";
import { getSession } from "@/auth";
import {
	TALENT_POOL_FIELDS,
	TALENT_POOL_KEY_TTL_SECONDS,
} from "@/config/talent-pool";
import { env } from "@/helpers/env";
import { scopedSearchKey } from "@/lib/typesense-scoped-key";
import {
	type AccessUser,
	can,
	getSpaceAccess,
	isStaff,
} from "@/services/access";
import { cached } from "@/services/cache";
import { prisma } from "@/services/prisma";
import { HubMembersClient } from "./HubMembersClient";

export const metadata: Metadata = {
	title: "Members",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub/members" },
	openGraph: { type: "website", url: "/hub/members", title: "Members" },
};

export default async function HubMembersPage() {
	const session = await getSession();
	const user = (session?.user ?? null) as AccessUser;

	const [access, { usersCount, specialitiesCount }, ownApprovedProjects] =
		await Promise.all([
			getSpaceAccess("hub", null, user),
			cached("stats:hub-members", 300, async () => {
				const [usersCount, specialitiesCount] = await Promise.all([
					prisma.user.count(),
					prisma.speciality.count(),
				]);
				return { usersCount, specialitiesCount };
			}),
			prisma.project.count({
				where: {
					authorId: session?.user?.id,
					status: ProjectStatus.Approved,
				},
			}),
		]);

	// The talent pool opens to people who run an approved project; staff sit outside that rule.
	const hasApprovedProjects = ownApprovedProjects !== 0 || isStaff(access);

	// The gate is enforced by Typesense itself: only a caller who passes it gets
	// a key, and the key can read nothing but active specialists' card fields.
	const parentKey = env("TYPESENSE_SEARCH_API_KEY", "");
	const searchKey =
		parentKey && hasApprovedProjects && can(access, "hub.talent_pool.view")
			? scopedSearchKey(parentKey, {
					filter_by: "isActive:true",
					include_fields: TALENT_POOL_FIELDS.join(","),
					expires_at:
						Math.floor(Date.now() / 1000) + TALENT_POOL_KEY_TTL_SECONDS,
				})
			: null;

	return (
		<HubMembersClient
			usersCount={usersCount}
			specialitiesCount={specialitiesCount}
			searchKey={searchKey}
		/>
	);
}
