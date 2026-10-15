import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import type { Metadata } from "next";
import { getSession } from "@/auth";
import { type AccessUser, getSpaceAccess, isStaff } from "@/services/access";
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

	const [access, usersCount, specialitiesCount, ownApprovedProjects] =
		await Promise.all([
			getSpaceAccess("hub", null, user),
			prisma.user.count(),
			prisma.speciality.count(),
			prisma.project.count({
				where: {
					authorId: session?.user?.id,
					status: ProjectStatus.Approved,
				},
			}),
		]);

	return (
		<HubMembersClient
			usersCount={usersCount}
			specialitiesCount={specialitiesCount}
			// The talent pool opens once you have an approved project. Staff are not
			// subject to that rule — they are not here to recruit.
			hasApprovedProjects={ownApprovedProjects !== 0 || isStaff(access)}
		/>
	);
}
