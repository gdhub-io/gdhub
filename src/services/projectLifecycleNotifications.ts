import type { GdhubDatabaseClient } from "@gdhub-io/gdhub-prisma";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { NovuService } from "./novu";

type ProjectLifecycleNotificationAction = "archive" | "delete";

type ProjectLifecycleRecipient = {
	userId: string;
	email?: string | null;
};

type ProjectLifecycleNotificationSnapshot = {
	projectId: string;
	projectName: string;
	projectSlug: string;
	recipients: ProjectLifecycleRecipient[];
};

const currentTeamMemberStatuses = [
	prismaClient.TeamMemberStatus.Founder,
	prismaClient.TeamMemberStatus.Hired,
];

export const getProjectLifecycleNotificationSnapshot = async ({
	db,
	projectId,
	authorId,
}: {
	db: GdhubDatabaseClient;
	projectId: string;
	authorId: string;
}): Promise<ProjectLifecycleNotificationSnapshot | null> => {
	const project = await db.project.findUnique({
		where: { id: projectId },
		select: {
			id: true,
			name: true,
			slug: true,
			team: {
				select: {
					members: {
						where: {
							userId: { not: authorId },
							status: { in: currentTeamMemberStatuses },
						},
						select: {
							userId: true,
							user: { select: { email: true } },
						},
					},
				},
			},
		},
	});

	if (!project) return null;

	return {
		projectId: project.id,
		projectName: project.name,
		projectSlug: project.slug,
		recipients:
			project.team?.members.map((member) => ({
				userId: member.userId,
				email: member.user.email,
			})) || [],
	};
};

export const notifyProjectLifecycleRecipients = async ({
	action,
	snapshot,
}: {
	action: ProjectLifecycleNotificationAction;
	snapshot: ProjectLifecycleNotificationSnapshot | null;
}) => {
	if (!snapshot?.recipients.length) return;

	const isArchive = action === "archive";
	const title = isArchive ? "Project archived" : "Project deleted";
	const message = isArchive
		? `The project "${snapshot.projectName}" was archived by the project author.`
		: `The project "${snapshot.projectName}" was deleted by the project author.`;
	const redirectUrl = isArchive
		? `${process.env.NEXT_PUBLIC_APP_URL}/user/project/${snapshot.projectSlug}`
		: `${process.env.NEXT_PUBLIC_APP_URL}/hub`;

	await Promise.allSettled(
		snapshot.recipients.map((recipient) =>
			NovuService.send({
				template: "default-message",
				to: {
					subscriberId: recipient.userId,
					email: recipient.email || undefined,
				},
				payload: {
					title,
					message,
					redirectUrl,
				},
			}),
		),
	);
};
