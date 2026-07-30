import { QueueJobStatus, QueueJobType } from "@gdhub-io/gdhub-prisma";
import type { NextRequest } from "next/server";
import { apiError, json, withAuth } from "@/lib/api-handlers";
import { openAI } from "@/services/openai";
import { prisma } from "@/services/prisma";

export const POST = withAuth({ mode: "api" })(async (req: NextRequest) => {
	const job = (await req.json().catch(() => null)) as {
		name: string;
		data: any;
	} | null;
	if (!job) return apiError.badRequest("Invalid JSON body");

	const jobName = "matching-specialist-and-project";

	try {
		const { specialityId, projectId, specialistText, projectText } = job.data;

		const response = await openAI.matchingSpecAndProj(
			specialistText,
			projectText,
		);

		await prisma.matchingSpecialistAndProject.upsert({
			where: { projectAndSpecialist: { specialityId, projectId } },
			create: {
				specialityId,
				projectId,
				authorScore: response.authorScore,
				projectScore: response.projectScore,
				teamScore: response.teamScore,
				summary: response.summary,
				avgScore: Math.round(
					(response.authorScore + response.projectScore + response.teamScore) /
						3,
				),
			},
			update: {
				authorScore: response.authorScore,
				projectScore: response.projectScore,
				teamScore: response.teamScore,
				summary: response.summary,
				avgScore: Math.round(
					(response.authorScore + response.projectScore + response.teamScore) /
						3,
				),
			},
		});

		const result = { success: true };

		await prisma.queueJobLog.create({
			data: {
				name: jobName,
				status: QueueJobStatus.Completed,
				type: QueueJobType.Broker,
				data: result,
			},
		});

		return json(result);
	} catch (e: any) {
		await prisma.queueJobLog.create({
			data: {
				name: jobName,
				status: QueueJobStatus.Failed,
				type: QueueJobType.Broker,
				log: (e as Error).message,
			},
		});

		return json(null);
	}
});
