import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/services/prisma";
import { EventPageClient, type EventPageProps } from "./EventPageClient";

type Params = Promise<{ slug: string }>;

const loadEvent = cache(
	async (slug: string): Promise<EventPageProps["event"] | null> => {
		const event = await prisma.event.findFirst({
			where: { slug, lang: "en" },
			include: { schedule: { orderBy: { startDate: "asc" } } },
		});
		if (!event) return null;
		return {
			...event,
			createdAt: event.createdAt,
			updatedAt: event.updatedAt,
			publishedAt: event.publishedAt,
			content: event.content
				? (JSON.stringify(event.content) as any)
				: (null as any),
			schedule: event.schedule || [],
		} as EventPageProps["event"];
	},
);

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { slug } = await params;
	const event = await loadEvent(slug);
	if (!event) return { title: "Event" };
	return {
		title: event.title || undefined,
		description: event.shortDescription || undefined,
		alternates: { canonical: `/event/${slug}` },
		openGraph: {
			type: "article",
			url: `/event/${slug}`,
			title: event.title || undefined,
			description: event.shortDescription || undefined,
			images: event.image
				? [{ url: event.image, alt: event.title || "Event" }]
				: undefined,
		},
	};
}

export default async function EventPage({ params }: { params: Params }) {
	const { slug } = await params;
	const event = await loadEvent(slug);
	if (!event) notFound();

	return (
		<EventPageClient
			event={event}
			seo={{
				title: event.title || null,
				description: event.shortDescription || null,
				image: event.image || null,
			}}
		/>
	);
}
