import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter'

export class InstantsearchAdapter {
	searchClient: any

	constructor() {
		// console.log({
		// 	nodes: [
		// 		{
		// 			host: process.env.NEXT_PUBLIC_TYPESENSE_HOST as string,
		// 			port: Number.parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT as string),
		// 			protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL as string,
		// 		},
		// 	],
		// 	apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API as string,
		// })
		const adapter = new TypesenseInstantSearchAdapter({
			server: {
				nodes: [
					{
						host: process.env.NEXT_PUBLIC_TYPESENSE_HOST as string,
						port: Number.parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT as string),
						protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL as string,
					},
				],
				apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API as string,
				cacheSearchResultsForSeconds: 2 * 60,
			},
			additionalSearchParameters: {
				query_by: 'name,city,country,schools,jobs,tools,skills,direction,specialization',
			},
		})

		this.searchClient = adapter.searchClient
	}
}
