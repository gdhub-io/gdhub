import { InvitationStatus } from "@gdhub-io/gdhub-prisma";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const url = new URL(req.url);
	const id = url.searchParams.get("id");
	if (!id) return apiError.badRequest("id is required");

	const speciality = await prisma.speciality.findFirst({
		where: { userId: currentUser.id, id },
		include: { direction: true },
	});

	return json(speciality);
});

export const POST = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const body = (await req.json().catch(() => null)) as {
		data?: {
			tools?: unknown;
			teamInvitationId?: string;
			[key: string]: unknown;
		};
	} | null;
	if (!body?.data) return apiError.badRequest("Invalid body");
	const { data } = body;

	await prisma.speciality.create({
		data: {
			...data,
			userId: currentUser.id,
			tools: data.tools,
		} as any,
		include: { direction: true },
	});

	if (data.teamInvitationId) {
		const teamInvitation = await prisma.teamInvitation.findUnique({
			where: { id: data.teamInvitationId },
		});

		if (teamInvitation) {
			await prisma.teamInvitation.update({
				where: { id: data.teamInvitationId },
				data: { status: InvitationStatus.Accepted },
			});
		}
	}

	// Adding a speciality used to push `UserRole.Member`. Hub membership is
	// written when onboarding completes; having a speciality is not what makes
	// someone a member.
	return json(null);
});

export const PUT = withAuth({ mode: "user" })(async (req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const body = (await req.json().catch(() => null)) as {
		id?: string;
		data?: { workDirectionId?: string; [key: string]: unknown };
	} | null;
	if (!body?.id || !body.data) return apiError.badRequest("Invalid body");
	const {
		id,
		data: { workDirectionId, ...otherData },
	} = body;

	await prisma.speciality.update({
		where: { id },
		data: {
			...otherData,
			direction: workDirectionId
				? { connect: { id: workDirectionId } }
				: undefined,
		} as any,
		include: { direction: true },
	});

	return json(null);
});

export const DELETE = withAuth({ mode: "user" })(
	async (req, _ctx, { user }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const url = new URL(req.url);
		const id = url.searchParams.get("id");
		if (!id) return apiError.badRequest("id is required");

		await prisma.speciality.delete({ where: { id } });
		return json(null);
	},
);
