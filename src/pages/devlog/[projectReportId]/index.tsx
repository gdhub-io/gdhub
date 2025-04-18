import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { ClockCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Card, Typography, Spin } from 'antd'
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
			{isLoading ? (
				<Spin size="large" />
			) : !post ? (
				<Title level={2}>{t('Post not found')}</Title>
			) : (
				<Card className={styles.postCard}>
					<div className={styles.postHeader}>
						<div className={styles.authorInfo}>
							{post.author?.image && (
								<Image
									src={post.author.image}
									alt={post.author.name || 'Author'}
									width={24}
									height={24}
									className={styles.authorAvatar}
								/>
							)}
							<span className={styles.authorName}>{post.author?.name}</span>
						</div>
						<div className={styles.postMeta}>
							<span>
								<ClockCircleOutlined style={{ marginRight: 4 }} />
								{formatDate(post.publishedAt)}
							</span>
						</div>
					</div>

					<div className={styles.postContent}>
						<ReactMarkdown
							rehypePlugins={[rehypeRaw as any]}
							components={{
								img: (props) => (
									<Image
										src={props.src || ''}
										alt={props.alt || ''}
										width={800}
										height={600}
										style={{ maxWidth: '100%', height: 'auto' }}
									/>
								),
							}}
						>
							{post.content}
						</ReactMarkdown>

						{!!post.video && (
							<div className={styles.playerWrapper}>
								<ReactPlayer url={post.video} light width="100%" height="100%" />
							</div>
						)}
					</div>
				</Card>
			)}
		</div>
	)

	return (
		<ProtectedLayout title={getPageTitle()} showBackButton subTitle={post?.project?.name}>
			{content}
		</ProtectedLayout>
	)
}

export default DevlogPostPage
