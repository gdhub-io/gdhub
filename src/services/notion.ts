import { AvailableLocales } from '@/config/locale'
import { Client } from '@notionhq/client'

// Initializing a client
const NotionService = new Client({
	auth: process.env.NOTION_TOKEN,
})

type GetPagesParams = {
	roles: string[]
	locale?: AvailableLocales
}

const getDatabase = ({ locale = AvailableLocales.en }: { locale: AvailableLocales }) => {
	let notionDatabaseId = process.env.NOTION_DATABASE_DOCS as string

	switch (locale) {
		case AvailableLocales.en:
			notionDatabaseId = process.env.NOTION_DATABASE_DOCS_EN as string
			break
		case AvailableLocales.ru:
			notionDatabaseId = process.env.NOTION_DATABASE_DOCS_RU as string
			break
	}

	return notionDatabaseId
}

export const getPages = async ({ roles = [], locale = AvailableLocales.en }: GetPagesParams) => {
	try {
		const filterParams: any = {
			and: [
				{
					property: 'Published',
					checkbox: {
						equals: true,
					},
				},
			],
		}

		if (roles.length > 0) {
			filterParams.and.push({
				or: [
					{
						property: 'Access',
						multi_select: {
							contains: 'everyone',
						},
					},
					...roles.map((roleName: string) => ({
						property: 'Access',
						multi_select: {
							contains: roleName.toLowerCase(),
						},
					})),
				],
			})
		} else {
			filterParams.and.push({
				property: 'Access',
				multi_select: {
					contains: 'everyone',
				},
			})
		}

		const pages = await NotionService.databases.query({
			database_id: getDatabase({ locale }),
			sorts: [{ property: 'Order', direction: 'ascending' }],
			filter: filterParams,
		})

		return pages.results
	} catch (error) {
		console.error(error)
		return null
	}
}

export const getPage = async ({ pageId }: { pageId: string }) => {
	try {
		const page = await NotionService.pages.retrieve({
			page_id: pageId,
		})

		return page
	} catch (error) {
		console.error(error)
		return null
	}
}

export const getBlocks = async (pageSlug: string, locale = AvailableLocales.en) => {
	try {
		const response = await NotionService.databases.query({
			database_id: getDatabase({ locale }),
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

export const getGamelabStageBlocks = async (
	stageName: string,
	lang = process.env.NEXT_PUBLIC_APP_DEFAULT_LOCALE as string
) => {
	try {
		const response = await NotionService.databases.query({
			database_id: process.env.NOTION_GL_STAGES_DOCS as string,
			filter: {
				and: [
					{
						property: 'stage',
						rich_text: {
							equals: stageName.toLowerCase(),
						},
					},
					{
						property: 'lang',
						select: { equals: lang.toLowerCase() },
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
