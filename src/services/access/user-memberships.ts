import { AuditAction } from "@gdhub-io/gdhub-prisma";
import {
	ROLE_SENIORITY,
	roleAtLeast,
	type SpaceRole,
} from "@/config/permissions/roles";
import { isSpaceType, type SpaceType } from "@/config/spaces";
import { prisma } from "@/services/prisma";
import { logRbacChange } from "./audit";
import { joinSpace, revokeSpaceMember } from "./membership";
import { DEFAULT_SPACE_ID } from "./types";

/**
 * Membership as the admin UI shows it: the stored row plus the name of the thing
 * it points at, because `spaceId` is a bare entity id.
 */
export type UserMembershipView = {
	spaceType: SpaceType;
	spaceId: string;
	role: SpaceRole;
	customRoleKey: string | null;
	title: string;
	/** False when the caller may see the row but not change it. */
	editable: boolean;
};

/**
 * Spaces platform staff may staff. Everything else is somebody's project, event
 * or course: administering the platform does not include joining them, and the
 * only identity that crosses that line is the super-admin (§2.2).
 */
const STAFF_EDITABLE: readonly SpaceType[] = ["hub", "admin", "dev"];

/** Strictly stronger, not merely equal: Owner > Admin > Member > Guest. */
const outranks = (actor: SpaceRole, target: SpaceRole): boolean =>
	ROLE_SENIORITY.indexOf(actor) < ROLE_SENIORITY.indexOf(target);

/**
 * Where the person being edited stands. Read here rather than passed in: this is
 * the check that stops an administrator from unseating their peers, and a caller
 * that forgot to supply it would silently disable it.
 */
const standingOf = async (userId: string) => {
	const [user, hub] = await Promise.all([
		prisma.user.findUnique({
			where: { id: userId },
			select: { isSuperAdmin: true },
		}),
		prisma.spaceMember.findUnique({
			where: {
				spaceType_spaceId_userId: {
					spaceType: "hub",
					spaceId: DEFAULT_SPACE_ID,
					userId,
				},
			},
			select: { role: true, revokedAt: true },
		}),
	]);

	return {
		isSuperAdmin: Boolean(user?.isSuperAdmin),
		hubRole: hub && !hub.revokedAt ? hub.role : null,
	};
};

const titleOf = async (
	rows: { spaceType: string; spaceId: string }[],
): Promise<Map<string, string>> => {
	const ids = (type: string) =>
		rows.filter((row) => row.spaceType === type).map((row) => row.spaceId);

	const [projects, events, courses] = await Promise.all([
		prisma.project.findMany({
			where: { id: { in: ids("project") } },
			select: { id: true, name: true },
		}),
		prisma.event.findMany({
			where: { id: { in: ids("event") } },
			select: { id: true, title: true },
		}),
		prisma.course.findMany({
			where: { id: { in: ids("course") } },
			select: { id: true, name: true },
		}),
	]);

	const titles = new Map<string, string>();

	for (const project of projects)
		titles.set(`project:${project.id}`, project.name);
	for (const event of events) titles.set(`event:${event.id}`, event.title);
	for (const course of courses) titles.set(`course:${course.id}`, course.name);

	return titles;
};

export const readUserMemberships = async (
	userId: string,
	{ canEditAnySpace }: { canEditAnySpace: boolean },
): Promise<UserMembershipView[]> => {
	const rows = await prisma.spaceMember.findMany({
		where: { userId, revokedAt: null },
		orderBy: [{ spaceType: "asc" }, { createdAt: "asc" }],
		select: {
			spaceType: true,
			spaceId: true,
			role: true,
			customRoleKey: true,
		},
	});

	const known = rows.filter((row) => isSpaceType(row.spaceType));
	const titles = await titleOf(known);

	return known.map((row) => {
		const spaceType = row.spaceType as SpaceType;

		return {
			spaceType,
			spaceId: row.spaceId,
			role: row.role,
			customRoleKey: row.customRoleKey,
			title: titles.get(`${spaceType}:${row.spaceId}`) ?? "Platform",
			editable: canEditAnySpace || STAFF_EDITABLE.includes(spaceType),
		};
	});
};

/**
 * Whether the actor may edit this person's roles at all. The same rule the write
 * path enforces — exported so the UI can grey the controls out instead of
 * offering an action that will be refused.
 */
export const canActorEditUser = async (
	userId: string,
	{
		actorUserId,
		actorHubRole,
		actorIsSuperAdmin,
	}: {
		actorUserId: string;
		actorHubRole: SpaceRole | null;
		actorIsSuperAdmin: boolean;
	},
): Promise<boolean> => {
	if (actorIsSuperAdmin) return true;
	if (userId === actorUserId) return false;

	const target = await standingOf(userId);

	if (target.isSuperAdmin) return false;
	if (!target.hubRole) return true;

	return Boolean(actorHubRole && outranks(actorHubRole, target.hubRole));
};

export class MembershipDeniedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "MembershipDeniedError";
	}
}

type MembershipChange = {
	spaceType: SpaceType;
	spaceId?: string;
	/** `null` removes the membership. */
	role: SpaceRole | null;
	customRoleKey?: string | null;
};

/**
 * Applies membership changes on behalf of an administrator.
 *
 * Four rules, all enforced here rather than in the UI:
 *  - nobody hands out a role stronger than their own in the hub, which is where
 *    platform power lives — otherwise `admin.users.manage` is a promotion to
 *    owner in one request;
 *  - nobody edits their own roles;
 *  - nobody edits someone who does not rank below them, and nobody but a
 *    super-admin edits a super-admin: administrators are peers, and peers do not
 *    unseat each other;
 *  - only a super-admin touches project / event / course membership.
 */
export const applyMembershipChanges = async ({
	userId,
	actorUserId,
	actorHubRole,
	actorIsSuperAdmin,
	changes,
}: {
	userId: string;
	actorUserId: string;
	actorHubRole: SpaceRole | null;
	actorIsSuperAdmin: boolean;
	changes: MembershipChange[];
}): Promise<{ applied: number }> => {
	for (const change of changes) {
		if (!actorIsSuperAdmin && !STAFF_EDITABLE.includes(change.spaceType)) {
			throw new MembershipDeniedError(
				`Only a super-admin changes membership of a ${change.spaceType} space`,
			);
		}

		if (
			!actorIsSuperAdmin &&
			change.role &&
			(!actorHubRole || !roleAtLeast(actorHubRole, change.role))
		) {
			throw new MembershipDeniedError(
				`Cannot grant "${change.role}" — it is stronger than your own role`,
			);
		}
	}

	if (userId === actorUserId && !actorIsSuperAdmin) {
		throw new MembershipDeniedError("Cannot change your own roles");
	}

	// Hands off anyone who is not below you.
	//
	// The rule above only limits what may be *granted*, and removal carries no
	// role at all — so without this an administrator could revoke every other
	// administrator, and the owner too. Demotion is how a takeover would be done,
	// and it needs the same ceiling as promotion.
	if (!actorIsSuperAdmin) {
		const target = await standingOf(userId);

		if (target.isSuperAdmin) {
			throw new MembershipDeniedError(
				"Only a super-admin changes a super-admin's roles",
			);
		}

		if (
			target.hubRole &&
			(!actorHubRole || !outranks(actorHubRole, target.hubRole))
		) {
			throw new MembershipDeniedError(
				`Cannot change the roles of a hub ${target.hubRole.toLowerCase()} — they do not rank below you`,
			);
		}
	}

	for (const change of changes) {
		const spaceId = change.spaceId ?? DEFAULT_SPACE_ID;

		if (change.role === null) {
			await revokeSpaceMember({ type: change.spaceType, spaceId, userId });
		} else {
			await joinSpace({
				type: change.spaceType,
				spaceId,
				userId,
				role: change.role,
				invitedById: actorUserId,
			});

			if (change.customRoleKey !== undefined) {
				await prisma.spaceMember.update({
					where: {
						spaceType_spaceId_userId: {
							spaceType: change.spaceType,
							spaceId,
							userId,
						},
					},
					data: { customRoleKey: change.customRoleKey },
				});
			}
		}

		await logRbacChange({
			entity: "space_membership",
			entityId: `${change.spaceType}:${spaceId}`,
			action: change.role === null ? AuditAction.DELETE : AuditAction.UPSERT,
			actorUserId,
			subjectUserId: userId,
			changes: {
				role: change.role,
				customRoleKey: change.customRoleKey ?? null,
			},
			meta: { spaceType: change.spaceType, spaceId },
		});
	}

	return { applied: changes.length };
};
