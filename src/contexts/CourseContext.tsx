import { createContext, type Dispatch, type SetStateAction } from "react";

export type ContextCourse = {
	id: string;
	name: string;
	isCourseAuthor: boolean;
};

export const CourseContext = createContext<
	| {
			contextCourse?: ContextCourse;
			isLoaded: boolean;
			setContextCourse: Dispatch<SetStateAction<ContextCourse | undefined>>;
	  }
	| undefined
>(undefined);
