import {
	BlogPostStatus,
	EventStatus,
	ProjectStatus,
} from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import type { MetadataRoute } from "next";
import { prisma } from "@/services/prisma";

const websiteUrl = process.env.NEXT_PUBLIC_APP_URL as string;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const [projects, vacancies, events, blogPosts] = await Promise.all([
		prisma.project.findMany({
			where: {
				status: {
					in: [
						ProjectStatus.Approved,
						ProjectStatus.Dormant,
						ProjectStatus.Released,
					],
				},
				team: { vacancies: { some: {} } },
			},
			orderBy: { updatedAt: "desc" },
		}),
		prisma.teamVacancy.findMany({
			where: {
				status: "Published",
				finishedAt: { gt: dayjs().toISOString() },
			},
			orderBy: { updatedAt: "desc" },
		}),
		prisma.event.findMany({
			where: {
				status: {
					in: [EventStatus.Published, EventStatus.Archived],
				},
				schedule: { some: {} },
			},
			orderBy: { updatedAt: "desc" },
		}),
		prisma.blogPost.findMany({
			where: {
				status: {
					in: [BlogPostStatus.Published, BlogPostStatus.Archived],
				},
			},
			orderBy: { updatedAt: "desc" },
		}),
	]);

	const today = dayjs();
	const entries: MetadataRoute.Sitemap = [
		{
			url: websiteUrl,
			lastModified: today.toDate(),
			changeFrequency: "monthly",
			priority: 0.8,
		},
		{
			url: `${websiteUrl}/checkpoint`,
			lastModified: today.toDate(),
			changeFrequency: "monthly",
			priority: 0.8,
		},
		{
			url: `${websiteUrl}/signin`,
			lastModified: today.toDate(),
			priority: 0.4,
		},
		{
			url: `${websiteUrl}/registration`,
			lastModified: today.toDate(),
			priority: 0.4,
		},
		{
			url: `${websiteUrl}/projects`,
			lastModified: projects[0]?.updatedAt ?? today.toDate(),
			priority: 0.8,
		},
		{
			url: `${websiteUrl}/vacancies`,
			lastModified: vacancies[0]?.updatedAt ?? today.toDate(),
			priority: 0.8,
		},
		{
			url: `${websiteUrl}/events`,
			lastModified: events[0]?.updatedAt ?? today.toDate(),
			priority: 0.8,
		},
		{
			url: `${websiteUrl}/blog`,
			lastModified: blogPosts[0]?.updatedAt ?? today.toDate(),
			priority: 0.8,
		},
	];

	for (const project of projects) {
		if (!project.slug) continue;
		entries.push({
			url: `${websiteUrl}/project/${project.slug}`,
			lastModified: project.updatedAt,
			changeFrequency: "weekly",
			priority: 0.7,
		});
	}

	for (const event of events) {
		if (!event.slug) continue;
		entries.push({
			url: `${websiteUrl}/event/${event.slug}`,
			lastModified: event.updatedAt,
			priority: event.status === EventStatus.Archived ? 0.3 : 0.7,
		});
	}

	for (const post of blogPosts) {
		if (!post.slug) continue;
		entries.push({
			url: `${websiteUrl}/blog/${post.slug}`,
			lastModified: post.updatedAt,
			changeFrequency: "weekly",
			priority: 0.7,
		});
	}

	return entries;
}
