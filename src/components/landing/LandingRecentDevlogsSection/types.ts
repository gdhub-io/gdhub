export interface DevlogPost {
	id: string;
	number: number | null;
	content: string;
	publishedAt: string;
	authorId: string;
	projectId: string;
	video?: string;
	pageCover?: string;
	author?: {
		name: string;
		image?: string;
	};
	project?: {
		name: string;
		slug: string;
		description?: string;
		coverImage?: string;
	};
}
