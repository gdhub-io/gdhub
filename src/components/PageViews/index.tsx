import { EyeOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Space } from "antd";
import axios from "axios";
import { useRouter } from "next/router";
import { type CSSProperties, useCallback } from "react";

interface PageViewsProps {
	path?: string;
	locale?: string;
	isUnique?: boolean;
	containerStyle?: CSSProperties;
	iconStyle?: CSSProperties;
	textStyle?: CSSProperties;
	minViews?: number;
	startDate?: string;
}

export const PageViews = ({
	path,
	locale,
	isUnique = true,
	startDate,
	containerStyle,
	iconStyle = { fontSize: "12px" },
	textStyle = { fontSize: "12px" },
	minViews = 10,
}: PageViewsProps) => {
	const router = useRouter();

	const { data: pageviews = 0 } = useQuery({
		queryKey: ["pageviews", path, router.asPath, startDate],
		queryFn: () => fetchPageviews(path, startDate),
		enabled: router.isReady,
	});

	const fetchPageviews = useCallback(
		async (path: string | undefined, startDate: string | undefined) => {
			try {
				let pageviews = 0;

				const currentPath = router.asPath;

				if (isUnique) {
					const globalResponse = await axios.get(
						`/api/analytics/pageviews?path=${path || currentPath}&startDate=${startDate}`,
					);

					pageviews = parseInt(globalResponse?.data?.pageviews || "0", 10);
				}

				if (locale) {
					const localeResponse = await axios.get(
						`/api/analytics/pageviews?path=/${locale}${path || currentPath}&startDate=${startDate}`,
					);

					pageviews += parseInt(localeResponse?.data?.pageviews || "0", 10);
				}

				return pageviews;
			} catch (error) {
				console.error("Error fetching pageviews:", error);
			}
		},
		[router, locale],
	);

	const formatPageviews = (views: string): string | null => {
		const num = parseInt(views, 10);

		if (Number.isNaN(num) || num < minViews) return null;

		if (num >= 1000000) {
			return `${(num / 1000000).toFixed(1)}M`;
		} else if (num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
		return num.toString();
	};

	const formattedViews = formatPageviews(pageviews.toString());

	if (!formattedViews) return null;

	return (
		<Space size={4} style={containerStyle}>
			<EyeOutlined style={iconStyle} />
			<span style={textStyle}>{formattedViews}</span>
		</Space>
	);
};
