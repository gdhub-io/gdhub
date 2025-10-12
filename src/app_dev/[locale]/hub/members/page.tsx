import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/services/prisma";
import MembersClient from "./MembersClient";

export const revalidate = 300;

async function getStats(userId?: string) {
	const isHealthy = await prisma.$isHealthy();
	if (!isHealthy) {
		return { usersCount: 0, specialitiesCount: 0, hasApprovedProjects: false };
	}

	const [usersCount, specialitiesCount, hasApprovedProjectsCount] = await Promise.all([
		prisma.user.count(),
		prisma.speciality.count(),
		userId
			? prisma.project.count({ where: { authorId: userId, status: "Approved" } })
			: Promise.resolve(0),
	]);

	return {
		usersCount,
		specialitiesCount,
		hasApprovedProjects: Boolean(hasApprovedProjectsCount),
	};
}

export default async function MembersPage() {
	const session = await getServerSession(authOptions);
	const stats = await getStats(session?.user?.id);
	return <MembersClient stats={stats} />;
}
