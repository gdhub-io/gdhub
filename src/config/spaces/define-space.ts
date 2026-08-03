import { type Action, isAction } from "@/config/permissions/actions";
import { SPACE_ROLES, type SpaceRole } from "@/config/permissions/roles";

/** Features of a space: name → actions it supports. */
export type SpaceFeatures = Record<string, readonly Action[]>;

/**
 * Deviation from the defaults for one role:
 *  - array — permissions granted on top of the defaults;
 *  - record — explicit `true` (grant), `false` (revoke) or `"own"` (grant,
 *    limited to the user's own records).
 */
export type RoleOverride =
	| readonly string[]
	| Readonly<Record<string, boolean | "own">>;

export type SpaceDefinition<
	TType extends string = string,
	TFeatures extends SpaceFeatures = SpaceFeatures,
> = {
	type: TType;
	features: TFeatures;
	overrides?: Partial<Record<SpaceRole, RoleOverride>>;
	/**
	 * Take the role from another space when this one has no membership of its
	 * own — e.g. the admin space is run by platform staff from the hub.
	 */
	inheritRoleFrom?: { space: string; atLeast: SpaceRole };
};

/** All permission strings a space definition produces. */
export type PermissionsOf<S> = S extends SpaceDefinition<
	infer TType,
	infer TFeatures
>
	? {
			[K in keyof TFeatures & string]: `${TType}.${K}.${TFeatures[K][number]}`;
		}[keyof TFeatures & string]
	: never;

/** Every permission of one space, as plain strings. */
export const permissionsOf = (space: SpaceDefinition): string[] =>
	Object.entries(space.features).flatMap(([feature, actions]) =>
		actions.map((action) => `${space.type}.${feature}.${action}`),
	);

const overridePermissions = (override: RoleOverride): string[] =>
	Array.isArray(override)
		? [...(override as readonly string[])]
		: Object.keys(override as Record<string, unknown>);

/**
 * Declares a space: which features it has and where it deviates from the
 * defaults. Pure data — no Prisma, no routing. The seed, the admin matrix (a
 * client component) and unit tests all import this, so it must stay importable
 * anywhere.
 *
 * See docs/roles-and-permissions.md §4.1.
 */
export function defineSpace<
	const TType extends string,
	const TFeatures extends SpaceFeatures,
>(
	definition: SpaceDefinition<TType, TFeatures>,
): SpaceDefinition<TType, TFeatures> {
	const { type, features, overrides } = definition;

	if (!type) throw new Error("defineSpace: space type is required");

	for (const [feature, actions] of Object.entries(features)) {
		if (actions.length === 0) {
			throw new Error(`${type}: feature "${feature}" declares no actions`);
		}

		for (const action of actions) {
			if (!isAction(action)) {
				throw new Error(
					`${type}.${feature}: unknown action "${action}". Add it to ACTIONS and give it a class first.`,
				);
			}
		}
	}

	const known = new Set(permissionsOf(definition as SpaceDefinition));

	for (const [role, override] of Object.entries(overrides ?? {})) {
		if (!(SPACE_ROLES as readonly string[]).includes(role)) {
			throw new Error(`${type}: unknown role "${role}" in overrides`);
		}

		for (const permission of overridePermissions(override)) {
			if (!known.has(permission)) {
				throw new Error(
					`${type}: override refers to "${permission}", which this space does not declare`,
				);
			}
		}
	}

	return definition;
}

/** Registry keyed by space type. */
export function registerSpaces<
	const TSpaces extends readonly SpaceDefinition<string, SpaceFeatures>[],
>(spaces: TSpaces): { [S in TSpaces[number] as S["type"]]: S } {
	const registry = {} as Record<string, SpaceDefinition>;

	for (const space of spaces) {
		if (registry[space.type]) {
			throw new Error(`registerSpaces: duplicate space type "${space.type}"`);
		}
		registry[space.type] = space as SpaceDefinition;
	}

	return registry as { [S in TSpaces[number] as S["type"]]: S };
}
