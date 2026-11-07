import { createContext } from "react";

export type ContextProject = {
	id: string;
	name: string;
	team: { id: string } | null;
	isProjectAuthor: boolean;
	isProjectArchived: boolean;
	archivedAt: Date | string | null;
};

export const ProjectContext = createContext<ContextProject | undefined>(
	undefined,
);
