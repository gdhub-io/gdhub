import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { NextApiRequest, NextApiResponse } from 'next'

const analyticsDataClient = new BetaAnalyticsDataClient({
	credentials: {
		client_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
		private_key: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
	},
	projectId: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ message: 'Method not allowed' })
	}

	try {
		const { path } = req.query
		const pathValue = (path as string).startsWith('http') ? new URL(path as string).pathname : (path as string)

		const [response] = await analyticsDataClient.runReport({
			property: `properties/${process.env.GOOGLE_ANALYTICS_PROPERTY_ID}`,
			dateRanges: [
				{
					startDate: '30daysAgo',
					endDate: 'today',
				},
			],
			dimensions: [
				{
					name: 'pagePath',
				},
			],
			metrics: [
				{
					name: 'screenPageViews',
				},
			],
			dimensionFilter: {
				filter: {
					fieldName: 'pagePath',
					stringFilter: {
						matchType: 'EXACT',
						value: pathValue,
					},
				},
			},
		})

		const pageviews = response.rows?.[0]?.metricValues?.[0]?.value || '0'

		res.status(200).json({ pageviews })
	} catch (error) {
		console.error('Error fetching pageviews:', error)
		res.status(500).json({ message: 'Error fetching pageviews' })
	}
}
