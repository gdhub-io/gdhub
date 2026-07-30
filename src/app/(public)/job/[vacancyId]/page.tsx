import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { JobPageClient, type JobPageProps } from "./JobPageClient";

type Params = Promise<{ vacancyId: string }>;

const loadVacancy = cache(
	async (vacancyId: string): Promise<JobPageProps["vacancy"] | null> => {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		const cookieHeader = (await headers()).get("cookie") ?? "";
		try {
			const response = await fetch(
				`${baseUrl}/api/project/vacancy?id=${encodeURIComponent(vacancyId)}`,
				{
					cache: "no-store",
					headers: cookieHeader ? { cookie: cookieHeader } : undefined,
				},
			);
			if (!response.ok) return null;
			const data = (await response.json()) as JobPageProps["vacancy"] | null;
			// A body without an id is not a vacancy, whatever the status said.
			if (!data?.id) return null;
			return data;
		} catch (error) {
			console.error("Error fetching vacancy:", error);
			return null;
		}
	},
);

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { vacancyId } = await params;
	const vacancy = await loadVacancy(vacancyId);
	if (!vacancy) return { title: "Vacancy" };
	return {
		title: vacancy.title,
		alternates: { canonical: `/job/${vacancyId}` },
		openGraph: {
			type: "article",
			url: `/job/${vacancyId}`,
			title: vacancy.title,
		},
	};
}

export default async function JobPage({ params }: { params: Params }) {
	const { vacancyId } = await params;
	if (!vacancyId) notFound();

	const [vacancy, session] = await Promise.all([
		loadVacancy(vacancyId),
		auth(),
	]);
	if (!vacancy) notFound();

	return (
		<JobPageClient
			vacancy={vacancy}
			pageCover={vacancy.team?.project?.coverImage ?? null}
			isAuthenticated={!!session}
		/>
	);
}
