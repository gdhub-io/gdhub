import { createContext, type Dispatch, type SetStateAction } from "react";

export type ContextProject = {
	id: string;
	name: string;
	team: { id: string } | null;
	isProjectAuthor: boolean;
	isProjectArchived: boolean;
	archivedAt: Date | string | null;
};

export const ProjectContext = createContext<
	| {
			contextProject?: ContextProject;
			isLoaded: boolean;
			setContextProject: Dispatch<SetStateAction<ContextProject | undefined>>;
	  }
	| undefined
>(undefined);
