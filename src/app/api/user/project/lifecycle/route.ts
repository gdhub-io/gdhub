import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import {
	getProjectLifecycleNotificationSnapshot,
	notifyProjectLifecycleRecipients,
} from "@/services/projectLifecycleNotifications";

const LifecycleQuerySchema = z.object({
	id: z.string().min(1),
});

const LifecycleActionSchema = z.object({
	id: z.string().min(1),
	action: z.enum(["delete", "archive", "restore"]),
});

type LifecycleQuery = z.infer<typeof LifecycleQuerySchema>;
type LifecycleActionBody = z.infer<typeof LifecycleActionSchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		LifecycleQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { id: projectId } = body as LifecycleQuery;

		try {
			const preview = await prisma.project.prepareToDeleting({
				projectId,
				authorId: currentUser.id,
			});
			return json(preview);
		} catch (error) {
			console.error("[user/project/lifecycle] error", error);
			return apiError.internal(
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}),
);

export const POST = withAuth({ mode: "user" })(
	withValidation(LifecycleActionSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { id: projectId, action } = body as LifecycleActionBody;
		const params = { projectId, authorId: currentUser.id };

		try {
			if (action === "delete") {
				const notificationSnapshot =
					await getProjectLifecycleNotificationSnapshot({
						db: prisma,
						projectId,
						authorId: currentUser.id,
					});
				const project = await prisma.project.deleteProject(params);
				await notifyProjectLifecycleRecipients({
					action: "delete",
					snapshot: notificationSnapshot,
				});
				return json(project);
			}

			if (action === "archive") {
				const notificationSnapshot =
					await getProjectLifecycleNotificationSnapshot({
						db: prisma,
						projectId,
						authorId: currentUser.id,
					});
				const project = await prisma.project.archiveProject(params);
				await notifyProjectLifecycleRecipients({
					action: "archive",
					snapshot: notificationSnapshot,
				});
				return json(project);
			}

			if (action === "restore") {
				const project = await prisma.project.restoreProject(params);
				return json(project);
			}

			return apiError.badRequest("Unsupported project lifecycle action");
		} catch (error) {
			console.error("[user/project/lifecycle] error", error);
			return apiError.internal(
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}),
);
