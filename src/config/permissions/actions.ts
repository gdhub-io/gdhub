/**
 * The only vocabulary shared by every space. A feature may use these actions and
 * no others — otherwise one space would say `issue`, another `give`, a third
 * `grant`, and the permission matrix in the admin UI would become unreadable.
 *
 * See docs/roles-and-permissions.md §3.3.
 */
export const ACTIONS = [
	// reading and entering
	"view",
	"access",
	"use",
	// participating
	"create",
	"apply",
	"request",
	"contact",
	// managing
	"edit",
	"manage",
	"invite",
	"remove",
	"review",
	"publish",
	"issue",
	"teach",
	// destroying
	"archive",
	"delete",
] as const;

export type Action = (typeof ACTIONS)[number];

/**
 * Actions are granted by class, not one by one: a new action only has to be
 * placed in a class to inherit sane defaults for every role.
 */
export type ActionClass = "read" | "manage" | "destructive";

/**
 * Every action must have a class — the `Record<Action, …>` makes the compiler
 * complain when a new action is added to ACTIONS but forgotten here.
 */
export const ACTION_CLASS: Record<Action, ActionClass> = {
	view: "read",
	access: "read",
	use: "read",
	create: "read",
	apply: "read",
	request: "read",
	contact: "read",
	edit: "manage",
	manage: "manage",
	invite: "manage",
	remove: "manage",
	review: "manage",
	publish: "manage",
	issue: "manage",
	teach: "manage",
	archive: "destructive",
	delete: "destructive",
};

export const isAction = (value: string): value is Action =>
	(ACTIONS as readonly string[]).includes(value);
