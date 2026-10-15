import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { defaultLocale } from "@/config/locale";
import { isHeadlineEvent, PUBLIC_EVENT_STATUSES } from "@/helpers/event";
import { formatEventPeriod } from "@/helpers/format";
import { prisma } from "@/services/prisma";
import { EventPageClient, type EventPageProps } from "./EventPageClient";

type Params = Promise<{ slug: string }>;

type LoadedEvent = NonNullable<EventPageProps["event"]>;

/**
 * Share card for an event.
 *
 * The page was posting the uploaded cover as its own share image, so a shared
 * link showed artwork with no title, date or type on it — the three things that
 * decide whether someone opens an event. The card carries the same type and
 * period the page header shows, formatted by the same helper, so the preview
 * and the page cannot disagree.
 *
 * Which card depends on the billing: a conference or game lab gets the
 * full-bleed `og-event-big`, everything else the split `og-event-small`. Both
 * refuse to render without a cover, so an event with no image falls back to the
 * generic card, which is built to work without one.
 */
const buildEventOgImage = (event: LoadedEvent) => {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
	const params = new URLSearchParams({ t: event.title });

	if (event.shortDescription) params.set("st", event.shortDescription);
	if (!event.image) return `${appUrl}/api/og?${params.toString()}`;

	// Both event cards refuse to render without a cover, so the fallback above
	// stays; which of the two applies is the same question the page asks.
	const card = isHeadlineEvent(event.type) ? "og-event-big" : "og-event-small";

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

	return `${appUrl}/api/${card}?${params.toString()}`;
};

const loadEvent = cache(
	async (slug: string): Promise<EventPageProps["event"] | null> => {
		// Speakers were never loaded here, so the programme listed sessions with
		// nobody attached to them. `level` and `specialization` come along because
		// the speaker sheet introduces a person, not just a name.
		const event = await prisma.event.findFirst({
			// Public means published. Without this the page served drafts to anyone
			// holding the slug, and an unpublished event stayed readable — the
			// organiser's own preview goes through the event space, which is gated.
			where: { slug, status: { in: [...PUBLIC_EVENT_STATUSES] } },
			// A slug is unique per locale, and there is no locale segment in the URL
			// to pick with — so the default locale wins where both exist, and an
			// event that only exists in the other one is still reachable rather than
			// a 404. Pinning this to `en` outright hid a published Russian event.
			orderBy: { lang: defaultLocale === "en" ? "asc" : "desc" },
			include: {
				schedule: {
					orderBy: { startDate: "asc" },
					include: {
						speakers: {
							select: {
								id: true,
								name: true,
								summary: true,
								specialization: true,
								level: true,
								user: {
									select: {
										image: true,
										profile: { select: { name: true } },
									},
								},
							},
						},
					},
				},
			},
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
