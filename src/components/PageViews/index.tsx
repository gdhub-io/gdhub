import { useEffect, useState } from 'react'
import { CSSProperties } from 'react'
import { EyeOutlined } from '@ant-design/icons'
import { Typography, Space } from 'antd'
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
	const [pageviews, setPageviews] = useState<string>('0')
	const router = useRouter()

	useEffect(() => {
		const fetchPageviews = async () => {
			try {
				const currentPath = router.asPath
				const response = await fetch(`/api/analytics/pageviews?path=${path || currentPath}&startDate=${startDate}`)
				const data = await response.json()
				setPageviews(data.pageviews)
			} catch (error) {
				console.error('Error fetching pageviews:', error)
			}
		}

		if (router.isReady) {
			fetchPageviews()
		}
	}, [path, router.asPath, router.isReady])

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
