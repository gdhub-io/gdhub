import { useCallback } from 'react'
import { CSSProperties } from 'react'
import { EyeOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Typography, Space } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'

const { Text } = Typography

interface PageViewsProps {
	path?: string
	containerStyle?: CSSProperties
	iconStyle?: CSSProperties
	textStyle?: CSSProperties
	minViews?: number
	startDate?: string
}

export const PageViews = ({
	path,
	startDate,
	containerStyle,
	iconStyle = { fontSize: '12px' },
	textStyle = { fontSize: '12px' },
	minViews = 10,
}: PageViewsProps) => {
	const router = useRouter()

	const { data: pageviews = 0, refetch: refetchPageviews } = useQuery({
		queryKey: ['pageviews', path, router.asPath, startDate],
		queryFn: () => fetchPageviews(path, startDate),
		enabled: router.isReady,
	})

	const fetchPageviews = useCallback(
		async (path: string | undefined, startDate: string | undefined) => {
			try {
				const currentPath = router.asPath
				const response = await axios.get(`/api/analytics/pageviews?path=${path || currentPath}&startDate=${startDate}`)

				return response?.data?.pageviews || 0
			} catch (error) {
				console.error('Error fetching pageviews:', error)
			}
		},
		[router]
	)

	const formatPageviews = (views: string): string | null => {
		const num = parseInt(views)

		if (isNaN(num) || num < minViews) return null

		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + 'M'
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'K'
		}
		return num.toString()
	}

	const formattedViews = formatPageviews(pageviews)

	if (!formattedViews) return null

	return (
		<Space size={4} style={containerStyle}>
			<EyeOutlined style={iconStyle} />
			<span style={textStyle}>{formattedViews}</span>
		</Space>
	)
}
