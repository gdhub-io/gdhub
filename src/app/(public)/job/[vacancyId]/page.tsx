import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { findPublicVacancy } from "@/repositories/vacancy.repository";
import { JobPageClient, type JobPageProps } from "./JobPageClient";

type Params = Promise<{ vacancyId: string }>;

const loadVacancy = cache(
	async (vacancyId: string): Promise<JobPageProps["vacancy"] | null> => {
		const vacancy = await findPublicVacancy(vacancyId);
		// Dates as strings, the shape the client was written against.
		return vacancy ? JSON.parse(JSON.stringify(vacancy)) : null;
	},
);

/**
 * Share card for a vacancy, rendered by `/api/og-job`.
 *
 * Cooperation terms follow the same precedence as `VacancyCard` on the jobs
 * board — paid, then equity, then "For experience" — so the card in a shared
 * link makes the same promise as the card in the list. `vTerms` is an equity
 * *percentage*: the route prints `Equity offered: {vTerms}%`, and 0 falls
 * through to the next branch. A missing cover is fine: the card drops the image
 * layer and keeps the gradient.
 */
const buildJobOgImage = (vacancy: NonNullable<JobPageProps["vacancy"]>) => {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
	const project = vacancy.team?.project;
	const params = new URLSearchParams({ t: vacancy.title });

	if (project?.name) params.set("st", project.name);
	if (vacancy.direction?.name) params.set("dir", vacancy.direction.name);
	if (vacancy.offeredAmount != null && vacancy.offeredRateType) {
		params.set("vAmount", String(vacancy.offeredAmount));
		params.set("vRate", vacancy.offeredRateType);
	} else if (vacancy.promisePercentage)
		params.set("vTerms", String(vacancy.promisePercentage));
	if (vacancy.finishedAt)
		params.set(
			"vDate",
			new Date(vacancy.finishedAt).toLocaleDateString("en-GB", {
				day: "numeric",
				month: "short",
				year: "numeric",
			}),
		);
	if (project?.coverImage) params.set("img", project.coverImage);

	return `${appUrl}/api/og-job?${params.toString()}`;
};

export const revalidate = 60;

// Empty: each page is built on its first request, not during `next build`.
export async function generateStaticParams() {
	return [];
}

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { vacancyId } = await params;
	const vacancy = await loadVacancy(vacancyId);
	if (!vacancy) return { title: "Vacancy" };
	const ogImage = buildJobOgImage(vacancy);
	return {
		title: vacancy.title,
		alternates: { canonical: `/job/${vacancyId}` },
		openGraph: {
			type: "article",
			url: `/job/${vacancyId}`,
			title: vacancy.title,
			images: [{ url: ogImage, width: 1200, height: 630 }],
		},
		twitter: {
			card: "summary_large_image",
			title: vacancy.title,
			images: [ogImage],
		},
	};
}

export default async function JobPage({ params }: { params: Params }) {
	const { vacancyId } = await params;
	if (!vacancyId) notFound();

	const vacancy = await loadVacancy(vacancyId);
	if (!vacancy) notFound();

	return (
		<JobPageClient
			vacancy={vacancy}
			pageCover={vacancy.team?.project?.coverImage ?? null}
		/>
	);
}
