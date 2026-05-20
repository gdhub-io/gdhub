import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/services/prisma";
import { HubMembersClient } from "./HubMembersClient";

export const metadata: Metadata = { title: "Members" };

export default async function HubMembersPage() {
	const session = await auth();
	const [usersCount, specialitiesCount, hasApprovedProjects] =
		await Promise.all([
			prisma.user.count(),
			prisma.speciality.count(),
			prisma.project.count({
				where: {
					authorId: session?.user?.id,
					status: prismaClient.ProjectStatus.Approved,
				},
			}),
		]);

	return (
		<HubMembersClient
			usersCount={usersCount}
			specialitiesCount={specialitiesCount}
			hasApprovedProjects={
				hasApprovedProjects !== 0 ||
				!!session?.user?.roles?.includes(prismaClient.UserRole.Admin)
			}
		/>
	);
}
