type LectureStatus =
	| "Requested"
	| "Proposed"
	| "Actualized"
	| "Canceled"
	| "Ready"
	| "Held";

type LectureDirection =
	| "Programming"
	| "Game Design"
	| "2D Art & Animation"
	| "3D Art & Animation"
	| "Project Management"
	| "Product Management"
	| "Technical Artist"
	| "Team Management";

interface DataType {
	key: string;
	Name: string;
	Status: LectureStatus;
	Direction: LectureDirection;
	Wishes: string;
	[key: string]: any;
}

declare global {
	interface Window {
		$crisp?: any;
	}
}
