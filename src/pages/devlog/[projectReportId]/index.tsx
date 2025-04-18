import { PageViews } from '@/components/PageViews'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { ClockCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Card, Typography, Spin, Space, Image as AntImage } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import { useRouter } from 'next/router'
import ReactMarkdown from 'react-markdown'
import ReactPlayer from 'react-player/lazy'
import rehypeRaw from 'rehype-raw'
import styles from './styles.module.scss'

const { Title, Text } = Typography

interface DevlogPost {
	id: string
	projectId: string
	content: string
	coverImage?: string
	publishedAt: string
	video: string | null
	project?: {
		name: string
		coverImage: string
		slug: string
	}
	author?: {
		name?: string
		image?: string
	}
}

const DevlogPostPage = () => {
	const { t } = useTolgee()
	const router = useRouter()
	const { projectReportId } = router.query

	const { data: post, isLoading } = useQuery<DevlogPost>(
		['devlog-post', projectReportId],
		() => axios.get(`/api/user/project/report?id=${projectReportId}`).then((res) => res.data),
		{
			enabled: !!projectReportId,
		}
	)

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return ''
		try {
			const date = new Date(dateString)
			return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		} catch (e) {
			return ''
		}
	}

	const getPageTitle = () => {
		if (!post) return 'Devlog'
		const date = new Date(post.publishedAt)
		return `Devlog at ${date.toLocaleDateString()}`
	}

	console.log('Post data:', post)
	console.log('Project name:', post?.project?.name)

	const content = (
		<div className={styles.container}>
			<Card className={styles.postCard}>
				{isLoading ? (
					<Spin />
				) : (
					<>
						<div className={styles.postHeader}>
							<Space align="center">
								{post?.author?.image && (
									<Image
										src={post.author.image}
										alt={post.author.name || ''}
										width={32}
										height={32}
										style={{ borderRadius: '50%' }}
									/>
								)}
								<Title level={4}>{post?.author?.name || t('Unknown Author')}</Title>
							</Space>
							<Space size={8}>
								<ClockCircleOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
								<Text type="secondary">{formatDate(post?.publishedAt)}</Text>
								<Text
									type="secondary"
									style={{ fontSize: '10px', display: 'flex', alignItems: 'center', opacity: 0.3 }}
								>
									•
								</Text>
								<PageViews
									textStyle={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}
									iconStyle={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}
								/>
							</Space>
						</div>
						{post?.coverImage && (
							<div className={styles.coverImage}>
								<Image
									src={post.coverImage}
									alt={post.project?.name || ''}
									fill
									sizes="(max-width: 800px) 100vw, 800px"
									priority
								/>
							</div>
						)}
						<div className={styles.content}>
							<ReactMarkdown
								rehypePlugins={[rehypeRaw as any]}
								components={{
									img: (props) => (
										<AntImage
											src={props.src || ''}
											alt={props.alt || ''}
											width={props.width}
											height={props.height}
											preview
										/>
									),
								}}
							>
								{post?.content || ''}
							</ReactMarkdown>
						</div>
						{post?.video && (
							<div className={styles.video}>
								<ReactPlayer url={post.video} width="100%" height="100%" controls />
							</div>
						)}
					</>
				)}
			</Card>
		</div>
	)

	return (
		<ProtectedLayout title={getPageTitle()} showBackButton subTitle={post?.project?.name}>
			{content}
		</ProtectedLayout>
	)
}

export default DevlogPostPage
