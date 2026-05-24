import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import dayjs from "dayjs";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json } from "@/lib/api-handlers";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const reminderMonth = 3;
const diffBetweenLogsInMonths = 1;

export async function GET() {
	const result = await runWithCronLog("devlog-reminder", async () => {
		const projects = await prisma.project.findMany({
			where: {
				status: prismaClient.ProjectStatus.Approved,
				finishedAt: { equals: null },
				author: {
					profile: { isActive: true },
					personalDataDeletedAt: null,
				},
				OR: [
					{ reports: { none: {} } },
					{
						reports: {
							none: {
								publishedAt: {
									gte: dayjs()
										.subtract(reminderMonth, "month")
										.startOf("day")
										.toDate(),
								},
							},
						},
					},
				],
			},
			include: {
				author: {
					select: {
						id: true,
						email: true,
						lang: true,
					},
				},
				_count: {
					select: {
						reports: true,
					},
				},
				reports: {
					orderBy: {
						publishedAt: "desc",
					},
				},
			},
		});

		if (projects.length === 0) {
			return;
		}

		const lastLogs = await prisma.queueJobLog.findMany({
			where: {
				name: "devlog-reminder",
				OR: projects.map((project: { id: string }) => ({
					data: {
						path: ["projectIds"],
						array_contains: [project.id],
					},
				})),
				createdAt: {
					gte: dayjs()
						.subtract(diffBetweenLogsInMonths, "month")
						.startOf("day")
						.toDate(),
					lt: dayjs().endOf("day").toDate(),
				},
			},
			select: {
				data: true,
			},
		});

		const alreadyNotifiedProjectIds = new Set(
			lastLogs.flatMap((log: { data: unknown }) => {
				const data = log.data as any;
				const ids = (data?.projectIds ?? []) as string[];
				return Array.isArray(ids) ? ids : [];
			}),
		);

		console.log(
			`Found ${projects.length} projects without new reports in the last ${reminderMonth} months (skipped ${alreadyNotifiedProjectIds.size})`,
		);

		if (alreadyNotifiedProjectIds.size === projects.length) {
			return;
		}

		const needToNotifyProjects: string[] = [];

		for (const project of projects.filter(
			(project: { id: string }) => !alreadyNotifiedProjectIds.has(project.id),
		)) {
			await NovuService.send({
				template: "share-project-news",
				to: {
					subscriberId: project.authorId,
					email: project.author.email || undefined,
				},
				payload: {
					locale: project.author.lang || "en",
					projectName: project.name,
					addDevlogPostUrl: `${process.env.NEXT_PUBLIC_APP_URL}/my/projects/${project.slug}`,
				},
			});

			needToNotifyProjects.push(project.id);
		}

		return { projectIds: needToNotifyProjects };
	});

	return json(result ?? null);
}
