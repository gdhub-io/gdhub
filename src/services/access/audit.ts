import { AuditAction } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";
import type { SpaceAccess } from "./types";

/**
 * Access events: a refusal, and a use of the super-admin bypass.
 *
 * Both go to `AuditLog` under their own actions, so "who was refused what" and
 * "when was break-glass used" are one query instead of a grep over logs.
 */

type AccessEvent = {
	permission: string;
	access: Pick<SpaceAccess, "type" | "id" | "role">;
	userId: string;
	route?: string;
};

/**
 * A refused request is cheap to repeat, and a scripted client would otherwise
 * fill the table with identical rows. The same (user, permission, space) is
 * recorded at most once a minute per process; the console line still fires every
 * time, so nothing disappears from the logs.
 */
const THROTTLE_MS = 60_000;
const lastWritten = new Map<string, number>();

const throttled = (key: string): boolean => {
	const now = Date.now();
	const previous = lastWritten.get(key);

	if (previous && now - previous < THROTTLE_MS) return true;

	lastWritten.set(key, now);

	// The map only grows on distinct keys, but an abusive client can invent many.
	if (lastWritten.size > 5_000) {
		for (const [entry, at] of lastWritten) {
			if (now - at >= THROTTLE_MS) lastWritten.delete(entry);
		}
	}

	return false;
};

const write = async (
	action: (typeof AuditAction)[keyof typeof AuditAction],
	{ permission, access, userId, route }: AccessEvent,
): Promise<void> => {
	try {
		await prisma.auditLog.create({
			data: {
				actorUserId: userId,
				entity: "space_access",
				entityId: `${access.type}:${access.id}`,
				action,
				meta: { permission, role: access.role, route },
			},
		});
	} catch (error) {
		// Auditing must never turn a working request into a failing one.
		console.error("[rbac] failed to write the audit entry", error);
	}
};

/** A caller had a role in the space but not this permission. */
export const logAccessDenied = async (event: AccessEvent): Promise<void> => {
	const { permission, access, userId, route } = event;

	console.warn(
		`[rbac] denied ${JSON.stringify({
			permission,
			space: `${access.type}:${access.id}`,
			role: access.role,
			userId,
			route,
		})}`,
	);

	if (throttled(`${userId}:${permission}:${access.type}:${access.id}`)) return;

	await write(AuditAction.ACCESS_DENIED, event);
};

/**
 * A change to the access rules themselves: the permission matrix, a custom role,
 * someone's membership.
 *
 * Written by hand rather than by the audit extension in the Prisma package,
 * which only covers the domain models. A row per intent ("admin lost
 * admin.users.manage") is also more useful here than a row per write — the same
 * save touches every permission of the role.
 */
type RbacChangeEvent = {
	entity: "space_role" | "space_custom_role" | "space_membership";
	entityId: string;
	action: (typeof AuditAction)[keyof typeof AuditAction];
	actorUserId: string;
	subjectUserId?: string;
	changes?: Record<string, unknown>;
	meta?: Record<string, unknown>;
};

export const logRbacChange = async (event: RbacChangeEvent): Promise<void> => {
	try {
		await prisma.auditLog.create({
			data: {
				actorUserId: event.actorUserId,
				subjectUserId: event.subjectUserId ?? null,
				entity: event.entity,
				entityId: event.entityId,
				action: event.action,
				changes: event.changes ?? {},
				meta: { source: "admin", ...event.meta },
			},
		});
	} catch (error) {
		console.error("[rbac] failed to write the audit entry", error);
	}
};

/**
 * The break-glass flag was used. Rare by design and the single most important
 * thing to be able to find later, so it is never throttled and is logged at
 * error level — not because something broke, but because it must not scroll past
 * unnoticed.
 */
export const logSuperAdminOverride = async (
	event: AccessEvent,
): Promise<void> => {
	const { permission, access, userId, route } = event;

	console.error(
		`[rbac] superadmin_override ${JSON.stringify({
			permission,
			space: `${access.type}:${access.id}`,
			role: access.role,
			userId,
			route,
		})}`,
	);

	await write(AuditAction.ACCESS_OVERRIDE, event);
};
