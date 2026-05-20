import { BetaAnalyticsDataClient } from "@google-analytics/data";
import dayjs from "dayjs";
import type { NextRequest } from "next/server";
import { apiError, json } from "@/lib/api-handlers";

const analyticsDataClient = new BetaAnalyticsDataClient({
	credentials: {
		client_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
		private_key: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.replace(
			/\\n/g,
			"\n",
		),
	},
	projectId: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
});

export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const path = url.searchParams.get("path") ?? "";
		const startDate = url.searchParams.get("startDate");
		const endDate = url.searchParams.get("endDate");

		const pathValue = path.startsWith("http") ? new URL(path).pathname : path;

		const [response] = await analyticsDataClient.runReport({
			property: `properties/${process.env.GOOGLE_ANALYTICS_PROPERTY_ID}`,
			dateRanges: [
				{
					startDate: startDate
						? dayjs(startDate).format("YYYY-MM-DD")
						: "30daysAgo",
					endDate: endDate ? dayjs(endDate).format("YYYY-MM-DD") : "today",
				},
			],
			dimensions: [
				{
					name: "pagePath",
				},
			],
			metrics: [
				{
					name: "screenPageViews",
				},
			],
			dimensionFilter: {
				filter: {
					fieldName: "pagePath",
					stringFilter: {
						matchType: "EXACT",
						value: pathValue,
					},
				},
			},
		});

		const pageviews = response.rows?.[0]?.metricValues?.[0]?.value || "0";

		return json({ pageviews });
	} catch (error) {
		console.error("Error fetching pageviews:", error);
		return apiError.internal("Error fetching pageviews");
	}
}
