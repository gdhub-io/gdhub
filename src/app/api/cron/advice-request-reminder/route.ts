import { AdviceRequestStatus } from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const reminderDiffDays = [3, 14];
const maxDaysWithoutResponse = 30;

export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("advice-request-reminder", async () => {
		// REMINDER ADVICE REQUESTS
		let needToNotifyAdviceRequests: typeof adviceRequestsToRemind = [];

		const adviceRequestsToRemind = await prisma.adviceRequest.findMany({
			where: {
				fromUser: { personalDataDeletedAt: null },
				toUser: { personalDataDeletedAt: null },
				status: AdviceRequestStatus.Created,
				finishedAt: { equals: null },
				OR: reminderDiffDays.map((d) => ({
					createdAt: {
						lt: dayjs().subtract(d, "day").toDate(),
						gt: dayjs().subtract(maxDaysWithoutResponse, "day").toDate(),
					},
				})),
			},
			include: {
				toUser: true,
				fromUser: true,
				project: true,
			},
		});

		if (adviceRequestsToRemind.length > 0) {
			const orConditions = [];
			for (const r of adviceRequestsToRemind) {
				for (const d of reminderDiffDays) {
					orConditions.push({
						data: {
							path: ["remindedAdviceRequestIds"],
							array_contains: [r.id],
						},
						createdAt: {
							gte: dayjs().subtract(d, "day").startOf("day").toDate(),
							lt: dayjs().endOf("day").toDate(),
						},
					});
				}
			}

			const lastLogs = await prisma.queueJobLog.findMany({
				where: {
					name: "advice-request-reminder",
					OR: orConditions,
				},
				select: {
					data: true,
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			const alreadyNotifiedAdviceRequestIds = new Set(
				lastLogs.flatMap((log: { data: unknown }) => {
					const data = log.data as any;
					const ids = (data?.remindedAdviceRequestIds ?? []) as string[];
					return Array.isArray(ids) ? ids : [];
				}),
			);

			console.log(
				`Found ${adviceRequestsToRemind.length} advice requests to remind (skipped ${alreadyNotifiedAdviceRequestIds.size})`,
			);

			needToNotifyAdviceRequests = adviceRequestsToRemind.filter(
				(r: { id: string }) => !alreadyNotifiedAdviceRequestIds.has(r.id),
			);

			for (const adviceRequest of needToNotifyAdviceRequests) {
				if (adviceRequest.toUserId) {
					await NovuService.send({
						template: "default-message",
						to: {
							subscriberId: adviceRequest.toUserId,
							email: adviceRequest.toUser?.email || undefined,
						},
						payload: {
							title: "You have an unanswered advice request",
							message: `You have an unanswered advice request from ${adviceRequest.project?.name}. Please answer it as soon as possible.`,
							redirectUrl: `https://t.me/gdhub_experts_bot/app?startapp=areq_${adviceRequest.id}`,
							redirectUrlType: "external",
						},
					});
				}
			}
		}

		// EXPIRED ADVICE REQUESTS
		const expiredAdviceRequests = await prisma.adviceRequest.findMany({
			where: {
				fromUser: { personalDataDeletedAt: null },
				toUser: { personalDataDeletedAt: null },
				status: AdviceRequestStatus.Created,
				finishedAt: { equals: null },
				createdAt: {
					lt: dayjs().subtract(maxDaysWithoutResponse, "day").toDate(),
				},
			},
			include: {
				toUser: true,
				fromUser: true,
				project: true,
			},
		});

		if (expiredAdviceRequests.length > 0) {
			await prisma.adviceRequest.updateMany({
				where: {
					id: { in: expiredAdviceRequests.map((r: { id: string }) => r.id) },
				},
				data: {
					status: AdviceRequestStatus.Closed,
					finishedAt: new Date(),
				},
			});

			for (const adviceRequest of expiredAdviceRequests) {
				if (adviceRequest.toUserId) {
					await NovuService.send({
						template: "default-message",
						to: {
							subscriberId: adviceRequest.toUserId,
						},
						payload: {
							title: "Advice request expired",
							message: `Advice request to you from ${adviceRequest.project?.name} has expired and was closed.`,
							redirectUrl: null,
						},
					});
				}

				if (adviceRequest.fromUserId) {
					await NovuService.send({
						template: "default-message",
						to: {
							subscriberId: adviceRequest.fromUserId,
						},
						payload: {
							title: "Advice request expired",
							message: `Advice request to mentor ${adviceRequest.toUser?.name} has expired and was closed.`,
							redirectUrl: null,
						},
					});
				}
			}
		}

		return {
			remindedAdviceRequestIds: needToNotifyAdviceRequests.map(
				(r: { id: string }) => r.id,
			),
			expiredAdviceRequestIds: expiredAdviceRequests.map(
				(r: { id: string }) => r.id,
			),
		};
	});

	return json(result ?? null);
});
