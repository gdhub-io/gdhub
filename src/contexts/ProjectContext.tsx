import { Dispatch, SetStateAction, createContext } from 'react'

export type ContextProject = {
	id: string
	name: string
	teamId: string
	isProjectAuthor: boolean
}

export const ProjectContext = createContext<
	| {
			contextProject?: ContextProject
			setContextProject: Dispatch<SetStateAction<ContextProject | undefined>>
	  }
	| undefined
>(undefined)
