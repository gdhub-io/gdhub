import { InvitationStatus, TeamMemberStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfTeam } from "@/lib/space-ids";
import { currentMembership } from "@/repositories/project/team";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const InviteMemberSchema = z.object({
	teamId: z.string(),
	email: z.string().email(),
	position: z.string(),
	directionId: z.string(),
	startedAt: z.string().optional(),
});

type InviteMemberBody = z.infer<typeof InviteMemberSchema>;

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.members.invite",
		idFrom: projectOfTeam,
	}),
	withValidation(InviteMemberSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const data = body as InviteMemberBody;

	try {
		const team = await prisma.team.findUnique({
			where: { id: data.teamId },
			include: {
				project: { select: { id: true, name: true, slug: true } },
			},
		});

		if (!team) {
			return apiError.notFound("Team not found");
		}

		const isFounder = await prisma.teamMember.findFirst({
			where: {
				teamId: data.teamId,
				userId: currentUser.id,
				status: TeamMemberStatus.Founder,
			},
		});

		if (!isFounder) {
			return apiError.forbidden("Only team founder can invite members");
		}

		const userRecord = await prisma.user.findUnique({
			where: { email: data.email },
		});

		if (!userRecord) {
			const invitation = await prisma.teamInvitation.create({
				data: {
					email: data.email,
					position: data.position,
					directionId: data.directionId,
					startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
					team: { connect: { id: data.teamId } },
					invitedBy: { connect: { id: currentUser.id } },
					status: InvitationStatus.Pending,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				},
			});

			try {
				await NovuService.send({
					template: "team-invitation",
					to: { subscriberId: data.email, email: data.email },
					payload: {
						invitationId: invitation.id,
						teamName: team.name || "Team",
						projectName: team.project?.name || "Project",
						projectSlug: team.project?.slug || "",
						position: data.position,
						startedAt: data.startedAt || new Date().toISOString(),
						inviterName: currentUser.name || "Project founder",
						acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.id}`,
					},
				});
			} catch (error) {
				console.error("Failed to send invitation email:", error);
			}

			return json({ success: true, message: "Invitation sent" });
		}

		const existingMember = await currentMembership(userRecord.id, {
			teamId: data.teamId,
		});

		if (existingMember) {
			return apiError.badRequest("User is already a member of this team");
		}

		const invitation = await prisma.teamInvitation.create({
			data: {
				email: data.email,
				position: data.position,
				directionId: data.directionId,
				startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
				team: { connect: { id: data.teamId } },
				invitedBy: { connect: { id: currentUser.id } },
				user: { connect: { id: userRecord.id } },
				status: InvitationStatus.Pending,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			},
		});

		try {
			await NovuService.send({
				template: "team-invitation",
				to: {
					subscriberId: userRecord.id,
					// biome-ignore lint/style/noNonNullAssertion: original semantics
					email: userRecord.email!,
				},
				payload: {
					invitationId: invitation.id,
					teamName: team.name || "Team",
					projectName: team.project?.name || "Project",
					projectSlug: team.project?.slug || "",
					position: data.position,
					startedAt: data.startedAt || new Date().toISOString(),
					inviterName: currentUser.name || "Project founder",
					acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.id}`,
				},
			});
		} catch (error) {
			console.error("Failed to send invitation email:", error);
		}

		return json({
			success: true,
			message: "Invitation sent to existing user",
		});
	} catch (error) {
		console.error("[team.invite]", error);
		return apiError.internal(
			error instanceof Error ? error.message : "Unknown error",
		);
	}
});
