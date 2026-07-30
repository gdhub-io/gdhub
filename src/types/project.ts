import type { ProjectWithActivity } from "@gdhub-io/gdhub-prisma";

/**
 * `prisma.project.getProjectsOrderedByActivity()` is a raw query whose final
 * SELECT also builds `author` and `workflow` json columns. The package's
 * `ProjectWithActivity` describes only the scalar activity metrics, so the two
 * projected relations are declared here. Every field is nullable: the joins are
 * LEFT joins, and `json_build_object` still emits an object full of nulls when
 * they miss.
 */
export type ProjectActivityRow = ProjectWithActivity & {
	author: { name: string | null } | null;
	workflow: {
		id: string | null;
		title: string | null;
		currentStep: {
			id: string | null;
			name: string | null;
			order: number | null;
			done: boolean | null;
		} | null;
	} | null;
};

export type LinkType =
	| ""
	| "steam"
	| "google-play"
	| "epic-store"
	| "itch-io"
	| "app-store"
	| "youtube"
	| "discord"
	| "facebook"
	| "linkedin"
	| "twitter"
	| "reddit";

export type ProjectLink = {
	platform: LinkType;
	link: string;
	isPrimary: boolean;
};
