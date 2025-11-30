import { createContext, type Dispatch, type SetStateAction } from "react";

export type ContextEvent = {
	id: string;
	title: string;
	isEventAuthor: boolean;
};

export const EventContext = createContext<
	| {
			contextEvent?: ContextEvent;
			isLoaded: boolean;
			setContextEvent: Dispatch<SetStateAction<ContextEvent | undefined>>;
	  }
	| undefined
>(undefined);
