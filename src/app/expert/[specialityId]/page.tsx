import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/services/prisma";
import { ExpertPageClient } from "./ExpertPageClient";

type Params = Promise<{ specialityId: string }>;

async function loadExpert(specialityId: string) {
	const expert = await prisma.user.findFirst({
		where: { specialities: { some: { id: specialityId } } },
		select: {
			id: true,
			name: true,
			image: true,
			investorInTeams: { select: { id: true, name: true } },
			lang: true,
			specialities: {
				where: { id: specialityId },
				select: { id: true, name: true, summary: true },
			},
			profile: { select: { name: true, motivation: true } },
		},
	});
	if (!expert) return null;
	const { specialities, ...rest } = expert;
	return { ...rest, speciality: specialities[0] };
}

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { specialityId } = await params;
	const expert = await loadExpert(specialityId);
	if (!expert) return { title: "Expert" };
	return {
		title: (expert as any).profile?.name || expert.name || undefined,
		description: (expert as any).profile?.motivation || undefined,
		openGraph: expert.image
			? { images: [{ url: expert.image, alt: expert.name || "" }] }
			: undefined,
	};
}

export default async function ExpertPage({ params }: { params: Params }) {
	const { specialityId } = await params;
	const session = await auth();
	const expert = await loadExpert(specialityId);
	if (!expert) notFound();

	return (
		<ExpertPageClient
			expert={expert}
			isAuthenticated={!!session}
			seo={{
				title: (expert as any).profile?.name || expert.name || null,
				description: (expert as any).profile?.motivation || null,
				image: expert.image || null,
			}}
		/>
	);
}
