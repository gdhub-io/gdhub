import { Client } from '@notionhq/client'

// Initializing a client
const NotionService = new Client({
	auth: process.env.NOTION_TOKEN,
})

export const getPages = async () => {
	try {
		const pages = await NotionService.databases.query({
			database_id: process.env.NOTION_DATABASE_DOCS as string,
			sorts: [{ property: 'Order', direction: 'ascending' }],
			filter: {
				property: 'Published',
				checkbox: {
					equals: true,
				},
			},
		})

		return pages.results
	} catch (error) {
		console.error(error)
		return null
	}
}

export const getBlocks = async (pageSlug: string) => {
	try {
		const response: any = await NotionService.databases.query({
			database_id: process.env.NOTION_DATABASE_DOCS as string,
			filter: {
				and: [
					{
						property: 'Published',
						checkbox: {
							equals: true,
						},
					},
					{
						property: 'Slug',
						rich_text: {
							equals: pageSlug,
						},
					},
				],
			},
		})

		const blocks = await NotionService.blocks.children.list({
			block_id: response.results[0].id,
		})

		return blocks.results
	} catch (error) {
		console.error(error)
		return null
	}
}

export default NotionService
