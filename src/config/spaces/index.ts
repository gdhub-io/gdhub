import { adminSpace } from "./admin";
import { courseSpace } from "./course";
import {
	type PermissionsOf,
	registerSpaces,
	type SpaceDefinition,
} from "./define-space";
import { devSpace } from "./dev";
import { eventSpace } from "./event";
import { hubSpace } from "./hub";
import { projectSpace } from "./project";

/**
 * Every space the platform has. Gates, the API guard, the access provider, the
 * admin matrix and the seed all go through this registry and know nothing about
 * individual spaces — adding one touches no shared code.
 *
 * See docs/roles-and-permissions.md §4.
 */
export const SPACES = registerSpaces([
	hubSpace,
	projectSpace,
	eventSpace,
	courseSpace,
	adminSpace,
	devSpace,
]);

export type SpaceType = keyof typeof SPACES;

/** Union of every permission string in the system, e.g. `project.members.invite`. */
export type Permission = PermissionsOf<(typeof SPACES)[SpaceType]>;

export const SPACE_TYPES = Object.keys(SPACES) as SpaceType[];

export const isSpaceType = (value: string): value is SpaceType =>
	value in SPACES;

export const spaceList = (): SpaceDefinition[] =>
	Object.values(SPACES) as SpaceDefinition[];

export {
	adminSpace,
	courseSpace,
	devSpace,
	eventSpace,
	hubSpace,
	projectSpace,
};
