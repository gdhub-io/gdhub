import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import { z } from "zod";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { formatNestedJson } from "@/helpers/format";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { matchingQueue } from "@/queues/matching.queue";
import { prisma } from "@/services/prisma";

const MatchingBodySchema = z.object({
	projectId: z.string().optional(),
	specialityId: z.string().optional(),
	take: z.number().optional(),
});

type MatchingBody = z.infer<typeof MatchingBodySchema>;

export const POST = pipe(
	withAuth({ mode: "vercel_cron" }),
	withValidation(MatchingBodySchema, "body"),
)(async (_req, _ctx, { body }) => {
	const { projectId, specialityId, take } = body as MatchingBody;

	const result = await runWithCronLog(
		"matching-specialist-vs-project",
		async () => {
			const lastUpdatedAt = dayjs().subtract(7, "days").toDate();

			const projects = await prisma.project.findMany({
				where: {
					id: projectId,
					status: ProjectStatus.Approved,
					author: { personalDataDeletedAt: null },
					OR: !specialityId
						? [
								{
									availableSpecialists: {
										some: { updatedAt: { lte: lastUpdatedAt } },
									},
								},
								{ availableSpecialists: { none: {} } },
							]
						: undefined,
				},
				select: {
					id: true,
					audition: true,
					coreMechanics: true,
					createdAt: true,
					description: true,
					genre: true,
					name: true,
					platform: true,
					setting: true,
					status: true,
					visualStyle: true,
					workflow: { select: { steps: true } },
					author: {
						select: {
							lang: true,
							profile: {
								select: {
									city: true,
									country: true,
									motivation: true,
									otherResources: true,
									timeForWork: true,
									yearOfBirth: true,
									primaryInterest: true,
									preferredGenres: { select: { name: true } },
									preferredLevels: { select: { name: true } },
									preferredSettings: { select: { name: true } },
								},
							},
						},
					},
					reports: {
						select: { content: true, publishedAt: true },
						take: 100,
						orderBy: { publishedAt: "desc" },
					},
					team: {
						select: {
							vacancies: {
								where: { status: "Published" },
								select: {
									title: true,
									direction: { select: { name: true } },
									description: true,
									publishedAt: true,
									finishedAt: true,
								},
							},
							members: {
								select: {
									speciality: {
										select: {
											name: true,
											summary: true,
											specialization: true,
											level: true,
											skills: true,
											tools: true,
											jobs: true,
											schools: true,
											createdAt: true,
											direction: { select: { name: true } },
										},
									},
									user: {
										select: {
											lang: true,
											profile: {
												select: {
													city: true,
													country: true,
													motivation: true,
													otherResources: true,
													timeForWork: true,
													yearOfBirth: true,
													primaryInterest: true,
													preferredGenres: { select: { name: true } },
													preferredLevels: { select: { name: true } },
													preferredSettings: { select: { name: true } },
												},
											},
										},
									},
								},
							},
						},
					},
				},
				take: !specialityId ? 1 : undefined,
			});

			const specialists = await prisma.speciality.findMany({
				where: {
					id: specialityId,
					user: { profile: { isActive: true }, personalDataDeletedAt: null },
					OR: [{ availableProjects: { none: {} } }],
				},
				select: {
					id: true,
					name: true,
					summary: true,
					specialization: true,
					level: true,
					skills: true,
					tools: true,
					jobs: true,
					schools: true,
					createdAt: true,
					direction: { select: { name: true } },
					user: {
						select: {
							lang: true,
							profile: {
								select: {
									city: true,
									country: true,
									motivation: true,
									otherResources: true,
									timeForWork: true,
									yearOfBirth: true,
									primaryInterest: true,
									preferredGenres: { select: { name: true } },
									preferredLevels: { select: { name: true } },
									preferredSettings: { select: { name: true } },
								},
							},
						},
					},
				},
				orderBy: { updatedAt: "desc" },
				take,
			});

			let matchingCount = 0;

			for (const specialist of specialists) {
				for (const project of projects) {
					const existMatching =
						await prisma.matchingSpecialistAndProject.findUnique({
							where: {
								projectAndSpecialist: {
									projectId: project.id,
									specialityId: specialist.id,
								},
								updatedAt: { gt: lastUpdatedAt },
							},
						});

					if (existMatching) continue;

					matchingCount++;

					const specialistText = formatNestedJson(specialist);
					const projectText = formatNestedJson(project);

					await matchingQueue.add("matching-spec-and-proj", {
						app: "main",
						specialityId: specialist.id,
						projectId: project.id,
						specialistText,
						projectText,
					});
				}
			}

			console.log(`Matching specialists in queue: ${matchingCount}`);
			return { matchingCount };
		},
	);

	return json(result ?? null);
});
