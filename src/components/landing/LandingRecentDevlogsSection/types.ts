export interface DevlogPost {
	id: string
	content: string
	publishedAt: string
	authorId: string
	projectId: string
	video?: string
	pageCover?: string
	createdAt: string
	author?: {
		name: string
		image?: string
	}
	project?: {
		name: string
		slug: string
		description?: string
		coverImage?: string
	}
}
