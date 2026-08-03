import { ACTION_CLASS, type Action, type ActionClass } from "./actions";
import { SpaceRole } from "./roles";

/**
 * Who gets an action by default, by class. This is the only place where "member
 * may read, admin may manage, owner may destroy" is written down; spaces only
 * declare exceptions.
 *
 * See docs/roles-and-permissions.md §3.5.
 */
export const CLASS_DEFAULT_ROLES: Record<ActionClass, readonly SpaceRole[]> = {
	read: [SpaceRole.Owner, SpaceRole.Admin, SpaceRole.Member],
	manage: [SpaceRole.Owner, SpaceRole.Admin],
	destructive: [SpaceRole.Owner],
};

/**
 * Guests never get anything by default — a guest is an invited observer, and
 * what they may see is always an explicit exception in the space descriptor.
 */
export const isAllowedByDefault = (action: Action, role: SpaceRole): boolean =>
	CLASS_DEFAULT_ROLES[ACTION_CLASS[action]].includes(role);
