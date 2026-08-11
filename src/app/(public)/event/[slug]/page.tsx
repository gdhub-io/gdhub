import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { formatEventPeriod } from "@/helpers/format";
import { prisma } from "@/services/prisma";
import { EventPageClient, type EventPageProps } from "./EventPageClient";

type Params = Promise<{ slug: string }>;

type LoadedEvent = NonNullable<EventPageProps["event"]>;

/**
 * Share card for an event, rendered by `/api/og-event-big`.
 *
 * The page was posting the uploaded cover as its own share image, so a shared
 * link showed artwork with no title, date or type on it — the three things that
 * decide whether someone opens an event. The card carries the same type and
 * period the page header shows, formatted by the same helper, so the preview
 * and the page cannot disagree.
 *
 * `og-event-big` draws the cover full-bleed under a gradient and refuses to
 * render without one, so an event with no cover falls back to the generic card,
 * which is built to work without an image.
 */
const buildEventOgImage = (event: LoadedEvent) => {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
	const params = new URLSearchParams({ t: event.title });

	if (event.shortDescription) params.set("st", event.shortDescription);
	if (!event.image) return `${appUrl}/api/og?${params.toString()}`;

	params.set("img", event.image);
	if (event.type) params.set("type", event.type);

	const schedule = event.schedule ?? [];
	if (schedule.length) {
		params.set(
			"date",
			formatEventPeriod(
				schedule[0].startDate,
				schedule[schedule.length - 1].endDate,
				"en",
				"day",
			),
		);
	}

	return `${appUrl}/api/og-event-big?${params.toString()}`;
};

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
	const ogImage = buildEventOgImage(event);
	return {
		title: event.title || undefined,
		description: event.shortDescription || undefined,
		alternates: { canonical: `/event/${slug}` },
		openGraph: {
			type: "article",
			url: `/event/${slug}`,
			title: event.title || undefined,
			description: event.shortDescription || undefined,
			images: [
				{
					url: ogImage,
					width: 1200,
					height: 630,
					alt: event.title || "Event",
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: event.title || undefined,
			description: event.shortDescription || undefined,
			images: [ogImage],
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
