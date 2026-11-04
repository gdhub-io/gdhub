import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { CONFIRMED_MEMBERS } from "@/repositories/project/team";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const CreateAdviceRequestSchema = z.object({
	topic: z.string().min(1),
	projectId: z.string().min(1),
	toUserId: z.string().min(1),
	comment: z.string().optional(),
});

type CreateAdviceRequestBody = z.infer<typeof CreateAdviceRequestSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(CreateAdviceRequestSchema)(
		async (_req, _ctx, { user, body }) => {
			const currentUser = user as SessionUser | undefined;
			if (!currentUser) return apiError.unauthorized();
			const { topic, projectId, toUserId, comment } =
				body as CreateAdviceRequestBody;

			// Advice is asked for one's own project: authored, or a team one is on today.
			const ownProject = await prisma.project.count({
				where: {
					id: projectId,
					OR: [
						{ authorId: currentUser.id },
						{
							team: {
								members: {
									some: { ...CONFIRMED_MEMBERS, userId: currentUser.id },
								},
							},
						},
					],
				},
			});
			if (!ownProject) return apiError.notFound("Project not found");

			const adviceRequest = await prisma.adviceRequest.create({
				data: {
					topic,
					projectId,
					toUserId,
					fromUserId: currentUser.id,
					comment,
				},
				include: {
					fromUser: true,
					toUser: true,
					project: true,
				},
			});

			// send a notification to the expert
			try {
				await NovuService.send({
					template: "default-message",
					to: {
						subscriberId: adviceRequest.toUserId,
						email: adviceRequest.toUser?.email || undefined,
					},
					payload: {
						title: "You have a new advice request",
						message: `You have a new advice request from ${adviceRequest.project?.name}. Please answer it as soon as possible.`,
						redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/user/advice-requests`,
						redirectUrlType: "internal",
					},
				});
			} catch (error) {
				console.error("[NovuService]", error);
			}

			return json(adviceRequest);
		},
	),
);
